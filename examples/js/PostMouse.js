(function(scope){

    'use strict';

    var PostMouse = function(){

        this.isRoot = window.self === window.top;
        var that = this;
        this.$document = $(document);
        this.$document.mousemove( function(e) {
            that.onMouseMove(e);
        });
        window.addEventListener("message", function(event){
            that.onReceiveMessage(event);
        }, false);

    };

    PostMouse.prototype = {
        mouseX: 0,
        mouseY: 0,
        onMouseMove: function(e){
            var mouseX = e.pageX;
            var mouseY = e.pageY;
            var width = this.$document.width();
            var height = this.$document.height();
            if(this.isRoot){
                this.mouseX = mouseX/width - 0.5;
                this.mouseY = mouseY/height - 0.5;
                this.notifyChildren();
            } else {
                this.notifyParent(mouseX, mouseY);
            }
        },
        onReceiveMessage: function(event){

            if(this.isRoot){
                this.onReceiveChildMessage(event);
            } else {
                this.onReceiveParentMessage(event);
            }
        },

        onReceiveParentMessage: function(event){
            // console.log('received parent message!', event);
            var message = JSON.parse(event.data);
            this.mouseX = message.mouseX;
            this.mouseY = message.mouseY;
        },
        onReceiveChildMessage: function(event){
            // console.log('received child message!', event);
            var message = JSON.parse(event.data);

            var iframes = $('iframe');
            var matchingIframe;
            for(var i = 0; i < iframes.length; ++i){
                var iframe = iframes[i];
                if(iframe.contentWindow === event.source){
                    var $iframe = $(iframe);
                    var position = $iframe.offset();
                    var mouseX = message.mouseX + position.left;
                    var mouseY = message.mouseY + position.top;
                    this.onMouseMove({pageX: mouseX, pageY: mouseY});
                }
            }
        },
        notifyParent: function(x, y){
            var message = {
                type: 'mousemove',
                mouseX: x,
                mouseY: y
            };
            message = JSON.stringify(message);
            // console.log('sending message to parent!', message);
            window.top.postMessage(message, "*");
        },
        notifyChildren: function(){
            var message = {
                type: 'mousemove',
                mouseX: this.mouseX,
                mouseY: this.mouseY
            };
            message = JSON.stringify(message);

            // console.log('sending message to children!', message);

            var iframes = $('iframe');
            for(var i = 0; i < iframes.length; ++i){
                iframes[i].contentWindow.postMessage(message, "*");
            }
        }
    };

    window.PostMouse = PostMouse;

}(this));