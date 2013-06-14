(function(scope){

    'use strict';

    var GLU = scope.GLU;
    var GLUTIL = scope.GLUTIL || (scope.GLUTIL = {});

    GLUTIL.TextureSpriteDrawer = function(gl){
        this.gl = gl;

        var fs = "";
        fs += "#ifdef GL_ES\n";
        fs += "precision highp float;\n";
        fs += "#endif\n";
        fs += "\n";
        fs += "uniform sampler2D uSampler;\n";
        fs += "varying vec2 vTextureCoord;\n";
        fs += "\n";
        fs += "void main(void) {\n";
        fs += "vec4 color = texture2D(uSampler, vTextureCoord);\n";
        fs += "gl_FragColor = vec4(color.rgb, 1.0);\n";
        fs += "}\n";

        var vs = "";
        vs += "attribute vec3 aVertexPosition;\n";
        vs += "attribute vec2 aTextureCoord;\n";
        vs += "uniform mat4 uMVMatrix;\n";
        vs += "varying vec2 vTextureCoord;\n";
        vs += "\n";
        vs += "void main(void) {\n";
        vs += "gl_Position = uMVMatrix * vec4(aVertexPosition, 1.0);\n";
        vs += "vTextureCoord = aTextureCoord;\n";
        vs += "}\n";

        this.program = new GLU.Program(
            gl,
            [new GLU.Shader(gl, null, fs, false), new GLU.Shader(gl, null, vs, true)]
        );

        this.material = new GLU.Material(gl, this.program, {uSampler: null});
        this.material.blendFunction = this.material.blendingNone;

        this.geometry = new GLU.Geometry(gl);
        this.geometry.makeRect(1, 1, 2, 2, {r: 1, g: 1, b: 0, a: 1}, 'aVertexPosition', 'aTextureCoord');
        var mvMatrix = new Float32Array(16);
        mvMatrix[0] = mvMatrix[5] = mvMatrix[10] = mvMatrix[15] = 1;
        this.uMVMatrix = new GLU.Uniform(gl, 'uMVMatrix', 'Matrix4fv', {matrix: mvMatrix, transpose: false}, ['transpose', 'matrix']);

        this.object = new GLU.Object(gl, this.geometry, this.material, [this.uMVMatrix]);

        this.sprites = [];
    };
    GLUTIL.TextureSpriteDrawer.prototype = {
        addSprite: function(texture, x, y, w, h, absolute){
            absolute = absolute || false;
            this.sprites.push({
                texture: texture,
                x: x,
                y: y,
                w: w,
                h: h,
                absolute: absolute
            });
        },
        updateMatrix: function(sprite){
            var x = sprite.x;
            var y = sprite.y;
            var w = sprite.w;
            var h = sprite.h;
            if(sprite.absolute){
                var canvas = this.gl.canvas;
                x /= canvas.width;
                y /= canvas.height;
                w /= canvas.width;
                h /= canvas.height;
            }
            x = x*2 - 1 + w;
            y = y*2 - 1 + h;
            var mvMatrix = this.uMVMatrix.matrix;
            mvMatrix[12] = x;
            mvMatrix[13] = y;
            mvMatrix[0] = w;
            mvMatrix[5] = h;
        },
        draw: function(){
            for(var i = 0; i < this.sprites.length; ++i){
                var sprite = this.sprites[i];
                this.updateMatrix(sprite);
                this.material.textures.uSampler = sprite.texture;
                this.object.bind();
                this.object.draw();
                this.object.unbind();
            }
        }
    };


}(this));