(function(scope){
    var document = scope.document;

    var GLU = scope.GLU;
    var GLUTIL = scope.GLUTIL || (scope.GLUTIL = {});

    GLUTIL.TexturePreview = function(gl, texture, width, height){
        this.gl = gl;
        this.texture = texture;
        this.width = width;
        this.height = height;

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
        this.texture = texture;

        this.material = new GLU.Material(gl, this.program, {uSampler: this.texture});
        this.material.blendFunction = this.material.blendingNone;

        this.geometry = new GLU.Geometry(gl);
        this.geometry.makeRect(1, 1, 0.5, 0.5, {r: 1, g: 1, b: 0, a: 1}, 'aVertexPosition', 'aTextureCoord');
        this.mvMatrix = new Float32Array(16);
        this.mvMatrix[0] = this.mvMatrix[5] = this.mvMatrix[10] = this.mvMatrix[15] = 1;
        this.mvMatrix[12] = 0.75;
        this.mvMatrix[13] = 0.75;
        this.uMVMatrix = new GLU.Uniform(gl, 'uMVMatrix', 'Matrix4fv', {matrix: this.mvMatrix, transpose: false}, ['transpose', 'matrix']);

        this.object = new GLU.Object(gl, this.geometry, this.material, [this.uMVMatrix]);
    };
    GLUTIL.TexturePreview.prototype = {
        draw: function(){
            this.object.bind();
            this.object.draw();
            this.object.unbind();
        }
    };


}(this));