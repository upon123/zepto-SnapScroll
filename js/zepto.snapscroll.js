/**
 * Created by admin on 14-4-17.
 */

(function ($,window) {
    var rAF = window.requestAnimationFrame  ||
        window.webkitRequestAnimationFrame  ||
        window.mozRequestAnimationFrame     ||
        window.oRequestAnimationFrame       ||
        window.msRequestAnimationFrame      ||
        function (callback) { window.setTimeout(callback, 1000 / 60); };

    var hasTouch = 'ontouchstart' in window,
        resizeEvent = 'onorientationchange' in window ? 'orientationchange' : 'resize',
        startEvent = hasTouch ? 'touchstart' : 'mousedown',
        moveEvent = hasTouch ? 'touchmove' : 'mousemove',
        endEvent = hasTouch ? 'touchend' : 'mouseup',
        cancelEvent = hasTouch ? 'touchcancel' : 'mouseup';

    /**
     * 定义一个插件 Plugin
     */
    var SnapScroll = (function () {

        function SnapScroll(element, options) {
            this.$el = $(element);
            //一些参数
            this.options = $.extend({}, $.fn.snapscroll.defaults,options);

            //初始化调用一下
            this.init();
        }


        /**
         * 写法二
         * 将插件所有函数放在prototype的大对象里
         * @type {{}}
         */
        SnapScroll.prototype = {
            //将构造函数的指向重新定位到Plugin
            constructor:SnapScroll,

            name:'scroll',

            version:'0.0.1',

            init:function(){

                this.$pages = this.$el.children();      //所有页面zepto对象
                this.length = this.$pages.length -1;       //页面个数
                this.height = this.$el.height();        //容器高度
                this.curIndex = 0;                      //当前展示页面
                this.newIndex = 0;                      //需要切换到下一页的索引
                this.startTime = null;                  //开始时间
                this.drag = null;                       //是否处于拖动状态
                this.startY = null;                   //touch start的值
                this.direction = null;                 //拖动的方向
                this.directionLocked = null;                    //方向初始化控制值
                this.$target = null;                    //确定拖动的目标

                this._initEvent();
                console.log('init');
            },

            /**
             * 初始化事件
             * @private
             */
            _initEvent:function(){
                this.$el.on(startEvent, $.proxy(this.handleEvent, this))
                        .on(moveEvent, $.proxy(this.handleEvent, this))
                        .on(endEvent, $.proxy(this.handleEvent, this))
                        .on(cancelEvent, $.proxy(this.handleEvent, this));
                this.$pages.on('webkitTransitionEnd', $.proxy(this.handleEvent, this));
                window.addEventListener(resizeEvent, this, false)
            },

            handleEvent:function(e){
                switch (e.type){
                    case 'tap': this._start(e);break;
                    case startEvent :
                        this._start(e);
                        break;
                    case moveEvent :
                        this._move(e);
                        break;
                    case endEvent :
                    case cancelEvent:
                        this._end(e);
                        break;
                    case 'webkitTransitionEnd':
                        this._flip();
                        break;
                    case resizeEvent:
                        this._resize();
                }
            },

            _start:function(e){
                //如果正在移动状态则返回
                if(this.moved) return;
                var point = hasTouch ? e.touches[0] : e;
                this.startTime = Date.now();
                this.drag      = true;
                this.startY    = point.pageY;       //start Y
            },

            /**
             * 移动
             * @param e
             * @private
             */
            _move: function (e) {
                e.preventDefault();
                e.stopPropagation();
                //如果正在移动状态 或者 不处于拖曳状态 则返回
                if(this.moved || !this.drag) return;

                var point       = hasTouch ? e.touches[0] : e,
                    deltaY      = point.pageY - this.startY;

                this.absDistY   = Math.abs(deltaY);

                if(this.absDistY < 5 ) return;
                //第一次移动则锁住 仅执行一次
//                debugger
                if(!this.directionLocked){
                    this.directionLocked = true;
                    //往上拖 即下一页
                    if(deltaY < 0){
                        this.direction = 'UP';
                        this.goTo(this.curIndex + 1);
                        //回调，参数：当前页面索引，下一个页面索引，移动方向
                        this.$el.trigger('start:' + this.name,[this.curIndex,this.newIndex,this.direction]);
                        //小于才移动
                        if(this.newIndex <= this.length){
                            this.$target = this.$pages.eq(this.newIndex);
                            this._translate(-this.height);
                        }

                    }else{
                        //往下滑
                        this.direction = 'DOWN';
                        this.goTo(this.curIndex - 1);
                        //回调，参数：当前页面索引，下一个页面索引，移动方向
                        this.$el.trigger('start:' + this.name,[this.curIndex,this.newIndex,this.direction]);
//                        this.newIndex = this.curIndex -1;

                        //判定边界值 如果是需要循环的话 则返回上一页
                        if(this.newIndex >= 0){
                            this.$target = this.$pages.eq(this.newIndex);
                            this._translate(-this.height);
                        }

                    }
                }
                //向上拖

                if(this.$target && this.direction === 'UP'){
                    this._translate(this.height + deltaY);
                }else if(this.$target && this.direction === 'DOWN'){
                    this._translate(deltaY -this.height);
                }



            },

            _end:function(e){
                //还原默认状态
                this.directionLocked = null;
                this.drag = null;
                if(!this.$target) return;
                this.moved = true;

                //4分之1不到的距离就回退
                if(this.direction === 'UP'){
                    //不到1/3
                    if(this.height / this.absDistY > 4){
                        this._scrollTo(this.height);
                        this.change = null;         //
                    }else{
                        this._scrollTo(0);
                        this.change = true;         //切换页面
                    }

                }else if(this.direction === 'DOWN'){
                    //不到1/3
                    if(this.height / this.absDistY > 4){
                        this._scrollTo(-this.height);
                        this.change = null;         //
                    }else{
                        this._scrollTo(0);
                        this.change = true;         //切换页面
                    }
                }

            },

            _flip:function(e){
                this._offTranslate();
                this.directionLocked = null;
                this.moved = null;
                if(this.change){
                    this.$pages.eq(this.curIndex).removeClass('show');
                    this.$target.addClass('show');
                    this.curIndex = this.newIndex;
                }
                this.$target.removeClass('active').removeAttr('style');
                this.$target = null;
                this.change = null;
                this.$el.trigger('done:' + this.name,[this.newIndex]);
            },

            _resize:function(){
                //重新设置容器高度
                this.height = this.$el.height();
            },

            /**
             * CSS3实现滚动到指定的地方
             * @param y 距离
             * @private
             */
            _translate: function (y) {
                var me = this;
                //将上rAF位移
                rAF(function(){
                    me.$target.addClass('active').css({
                        '-webkit-transform': 'translate3d(0,'+ y +'px,0)'
                    })
                });
            },

            _scrollTo:function(y, time, easing){
                time = time || 400;
                this.$target.css('-webkit-transition','-webkit-transform '+ time +'ms');
                this._translate(y);
            },

            _offTranslate:function(){
                this.$target.css('-webkit-transition','-webkit-transform 0ms');
            },

            /**
             * 跳转到指定页面
             * @param idx 页面索引
             */
            goTo:function(idx){
                console.info(this.newIndex,'index')
                this.newIndex = idx;
            }




        };

        return SnapScroll;

    })();


    /**
     * 这里是将Plugin对象 转为jq插件的形式进行调用
     * 定义一个插件 snapscroll
     */
    $.fn.snapscroll = function(options){
        return this.each(function () {
            var $this = $(this),
                instance = $.fn.snapscroll.lookup[$this.data('snapscroll')];
            if (!instance) {
                $.fn.snapscroll.lookup[++$.fn.snapscroll.lookup.i] = new SnapScroll(this,options);
                $this.data('snapscroll', $.fn.snapscroll.lookup.i);
                instance = $.fn.snapscroll.lookup[$this.data('snapscroll')];
            }

            if (typeof options === 'string') return instance[options].apply(instance,Array.prototype.slice.call(arguments, 1));
        })
    };

    $.fn.snapscroll.lookup = {i: 0};

    /**
     * 插件的默认值
     */
    $.fn.snapscroll.defaults = {
        loop: false                                //是否循环
    };

})(Zepto,window);
