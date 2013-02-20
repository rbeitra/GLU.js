(function(scope){
    var document = scope.document;
    var Image = scope.Image;
    var Int8Array = scope.Int8Array;
    var Uint8Array = scope.Uint8Array;
    var Int16Array = scope.Int16Array;
    var Uint16Array = scope.Uint16Array;
    var Int32Array = scope.Int32Array;
    var Uint32Array = scope.Uint32Array;
    var Float32Array = scope.Float32Array;

    var GLU = scope.GLU || (scope.GLU = {});

    GLU.Error = {
        errorFactory: function(name){
            var errorFunction = function(message, obj){
                obj = obj || {};
                var error = new Error();
                error.name = name;
                error.message = message;
                error.obj = obj;
                return error;
            };
            return errorFunction;
        },
        registerErrorClass: function(errorClass){
            var errorID = "GLU_" + errorClass.toUpperCase() + "_ERROR";
            GLU.Error[errorID] = errorID;
            GLU.Error[errorClass] = GLU.Error.errorFactory(errorID);
        }
    };
    GLU.Error.registerErrorClass("Uniform");
    GLU.Error.registerErrorClass("Shader");
    GLU.Error.registerErrorClass("Program");
    GLU.Error.registerErrorClass("Buffer");
    GLU.Error.registerErrorClass("Texture");
    GLU.Error.registerErrorClass("Material");
    GLU.Error.registerErrorClass("Geometry");
    GLU.Error.registerErrorClass("Object");
    GLU.Error.registerErrorClass("Framebuffer");
    GLU.Error.registerErrorClass("Unknown");


    GLU.Context = function(){
    };
    GLU.Context.prototype = {
        initGL: function(canvas){
            var gl;
            try {
                gl = canvas.getContext("experimental-webgl");
                gl.getExtension("OES_texture_float");//we use this for float textures
            } catch (e){
            }
            if (!gl){
                throw GLU.Error.Context("Could not initialise WebGL");
            }
            this.gl = gl;
        },
        Uniform: function(uniformName, type, data, positions){
            return new GLU.Uniform(this.gl, uniformName, type, data, positions);
        },
        Shader: function(id, shaderString, isVertex){
            return new GLU.Shader(this.gl, id, shaderString, isVertex);
        },
        Program: function(shaders, attributes, uniforms){
            return new GLU.Program(this.gl, shaders, attributes, uniforms);
        },
        Buffer: function(mode, dataType, itemSize, drawMode){
            return new GLU.Buffer(this.gl, mode, dataType, itemSize, drawMode);
        },
        Texture: function(){
            return new GLU.Texture(this.gl);
        },
        Material: function(program, textures){
            return new GLU.Material(this.gl, program, textures);
        },
        Geometry: function(buffers){
            return new GLU.Geometry(this.gl, buffers);
        },
        Object: function(geometry, material, uniforms){
            return new GLU.Object(this.gl, geometry, material, uniforms);
        },
        Framebuffer: function(){
            return new GLU.Framebuffer(this.gl);
        }
    };


    GLU.Core = function(gl){
        this.gl = gl;
    };


    GLU.Uniform = function(gl, uniformName, type, data, positions){
        GLU.Core.apply(this, [gl]);

        data = data || {};
        positions = positions || [];
        this.uniformName = uniformName;
        this.type = type;
        this.positions = positions || [];
        this.bindFunctionName = 'uniform' + this.type;
        this.bindFunction = this.gl[this.bindFunctionName];
        this.array = [null].concat(data);

        var i = 0;
        for (var s in data){
            this[s] = data[s];
            ++i;
            //autopopulate positions list if needed
            if (i > this.positions.length){
                this.positions.push(s);
            }
        }
    };
    GLU.Uniform.prototype = {
        bind: function(program){
            this.array[0] = program[this.uniformName];
            for (var i = 0; i < this.positions.length; ++i){
                this.array[i + 1] = this[this.positions[i]];
            }
            this.bindFunction.apply(this.gl, this.array);
        }
    };


    GLU.Shader = function(gl, id, shaderString, isVertex){
        GLU.Core.apply(this, [gl]);

        if (id){
            //an id was supplied so look for script contents
            var shaderScript = document.getElementById(id);
            if (!shaderScript){
                throw GLU.Error.Shader('Shader script element does not exist');
            }
            var str = "";
            var k = shaderScript.firstChild;
            while (k){
                if (k.nodeType == 3){
                    str += k.textContent;
                }
                k = k.nextSibling;
            }

            shaderString = str;

            if (shaderScript.type == "x-shader/x-fragment"){
                isVertex = false;
            } else if (shaderScript.type == "x-shader/x-vertex"){
                isVertex = true;
            } else {
                throw GLU.Error.Shader('Shader script type does not match');
            }

        } else {
            //we were supplied with a string
            if (!shaderString){
                throw GLU.Error.Shader('Shader script is not defined');
            }
        }

        var shader = gl.createShader(isVertex ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
        gl.shaderSource(shader, shaderString);
        gl.compileShader(shader);
        var typeString = isVertex ? 'vertex' : 'fragment';
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
            var log = gl.getShaderInfoLog(shader);
            throw GLU.Error.Shader('Shader compile error: ' + log, {
                type: typeString,
                log: log
            });
        }

        this.shader = shader;
    };


    GLU.Program = function(gl, shaders, attributes, uniforms){
        GLU.Core.apply(this, [gl]);

        attributes = attributes || [];
        uniforms = uniforms || [];
        shaders = shaders || [];
        this.attributes = attributes;
        this.uniforms = uniforms;
        this.shaders = shaders;

        var shaderProgram = gl.createProgram();

        this.program = shaderProgram;

        for (var i = 0; i < shaders.length; ++i){
            var shader = shaders[i];
            gl.attachShader(shaderProgram, shader.shader);
        }
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)){
            throw GLU.Error.Program("Could not initialise shaders");
        }

        gl.useProgram(shaderProgram);

        for (var i = 0; i < attributes.length; ++i){
            this.setupAttribute(attributes[i]);
        }
        for (var i = 0; i < uniforms.length; ++i){
            this.setupUniform(uniforms[i]);
        }
    };
    GLU.Program.prototype = {
        bind: function(){
            var gl = this.gl;
            gl.useProgram(this.program);
            for (var i = 0; i < this.attributes.length; ++i){
                gl.enableVertexAttribArray(this[this.attributes[i]]);
            }
        },
        unbind: function(){
            var gl = this.gl;
            for (var i = 0; i < this.attributes.length; ++i){
                gl.disableVertexAttribArray(this[this.attributes[i]]);
            }
        },
        setupAttribute: function(attributeName){
            var extName = attributeName;
            var id = this.gl.getAttribLocation(this.program, attributeName);
            this[extName] = id;
            if (id < 0){
                throw GLU.Error.Program("Could not setup attribute", {
                    attribute: extName
                });
            }
            this.gl.enableVertexAttribArray(id);
        },
        setupUniform: function(uniformName){
            var extName = uniformName;
            var id = this.gl.getUniformLocation(this.program, uniformName);
            this[extName] = id;
        }
    };


    GLU.Buffer = function(gl, mode, dataType, itemSize, drawMode){
        GLU.Core.apply(this, [gl]);

        this.mode = mode || this.gl.ARRAY_BUFFER;
        this.dataType = dataType || this.gl.FLOAT;
        this.itemSize = itemSize || 1;
        this.drawMode = drawMode || this.gl.STATIC_DRAW;

        this.buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.mode, this.buffer);

        this.checkBuffer(this.buffer);

        this.gl.bindBuffer(this.mode, null);
        this.length = 0;
    };
    GLU.Buffer.prototype = {
        bind: function(){
            this.gl.bindBuffer(this.mode, this.buffer);
        },
        unbind: function(){
            this.gl.bindBuffer(this.mode, null);
        },
        setArray: function(array){
            this.setData(this.arrayToTypedArray(array, this.dataType));
        },
        setData: function(data){
            this.bind();
            this.gl.bufferData(this.mode, data, this.drawMode);
            this.length = data.length;
            this.unbind();
        },
        arrayToTypedArray: function(array, type){
            var data;
            var gl = this.gl;
            switch (this.dataType){
            case gl.BYTE:
                data = new Int8Array(array);
                break;
            case gl.UNSIGNED_BYTE:
                data = new Uint8Array(array);
                break;
            case gl.SHORT:
                data = new Int16Array(array);
                break;
            case gl.UNSIGNED_SHORT:
                data = new Uint16Array(array);
                break;
            case gl.INT:
                data = new Int32Array(array);
                break;
            case gl.UNSIGNED_INT:
                data = new Uint32Array(array);
                break;
            case gl.FLOAT:
            default:
                data = new Float32Array(array);
                break;
            }
            return data;
        },
        checkBuffer: function(buffer){
            if (!this.gl.isBuffer(buffer)){
                throw GLU.Error.Buffer("Invalid buffer");
            }
        }
    };


    GLU.Texture = function(gl){
        GLU.Core.apply(this, [gl]);

        this.texture = this.gl.createTexture();
        this.width = 0;
        this.height = 0;
        this.setWrapClamp();
        this.setFilterNearest();
    };
    GLU.Texture.prototype = {
        bind: function(){
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        },
        unbind: function(){
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        },
        setImage: function(image, makePowerOfTwo){
            var gl = this.gl;
            makePowerOfTwo = makePowerOfTwo || false;

            if(makePowerOfTwo){
                image = this.createPowerOfTwoImage(image);
            }

            this.width = image.width;
            this.height = image.height;

            this.bind();

            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            //        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
            //        gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.BROWSER_DEFAULT_WEBGL);
            //        gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            this.unbind();
            this.createMipmapIfNeeded();
        },
        setFloatData: function(floatArray, width, height, format){
            var gl = this.gl;
            height = height || 1;
            width = width || (floatArray.length / height);
            format = format || gl.RGBA;
            this.width = width;
            this.height = height;

            this.bind();
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
            gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, gl.FLOAT, floatArray);
            this.unbind();
            this.createMipmapIfNeeded();
        },
        setupRenderBuffer: function(width, height){
            var gl = this.gl;
            this.width = width;
            this.height = height;
            this.bind();
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            this.unbind();
            this.createMipmapIfNeeded();
        },
        setWrapClamp: function(){
            var gl = this.gl;
            this.bind();
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            this.unbind();
        },
        setWrapRepeat: function(){
            var gl = this.gl;
            this.bind();
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            this.unbind();
        },
        setFilterNearest: function(){
            var gl = this.gl;
            this.bind();
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); //no interpolation
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            this.unbind();
        },
        setFilterLinear: function(){
            var gl = this.gl;
            this.bind();
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); //linear interpolation
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            this.unbind();
        },
        setFilterMipmap: function(){
            var gl = this.gl;
            this.bind();
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); //linear interpolation
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            // when images is loaded do gl.generateMipmap(gl.TEXTURE_2D), or this.createMipmapsIfNeeded();
            this.unbind();
        },
        createMipmapIfNeeded: function(){
            var gl = this.gl;
            this.bind();
            var currentMinFilter = gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER);
            switch(currentMinFilter){
                case gl.NEAREST_MIPMAP_NEAREST:
                case gl.LINEAR_MIPMAP_NEAREST:
                case gl.NEAREST_MIPMAP_LINEAR:
                case gl.LINEAR_MIPMAP_LINEAR:
                    gl.generateMipmap(gl.TEXTURE_2D);
                break;
                default:
                    // no mipmap needed
                break;
            }
            this.unbind();
        },
        loadImage: function(url, makePowerOfTwo, onComplete){
            var image = new Image();
            var that = this;
            image.onload = function(){
                that.setImage(image, makePowerOfTwo);
                if(onComplete){
                    onComplete(that);
                }
            };
            image.src = url;
        },
        createPowerOfTwoImage: function(image){
            if (!this.isPowerOfTwo(image.width) || !this.isPowerOfTwo(image.height)){
                // Scale up the texture to the next highest power of two dimensions.
                var canvas = document.createElement("canvas");
                canvas.width = this.nextHighestPowerOfTwo(image.width);
                canvas.height = this.nextHighestPowerOfTwo(image.height);
                var ctx = canvas.getContext("2d");
                ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, canvas.width, canvas.height);
                image = canvas;
            }
            return image;
        },
        isPowerOfTwo: function(x){
            return (x & (x - 1)) === 0;
        },
        nextHighestPowerOfTwo: function(x){
            --x;
            x = x | x >> 1;
            x = x | x >> 2;
            x = x | x >> 4;
            x = x | x >> 8;
            x = x | x >> 16;
            return x + 1;
        }
    };


    GLU.Material = function(gl, program, textures){
        GLU.Core.apply(this, [gl]);

        this.program = program;
        this.textures = textures || {};
        this.blendFunction = this.blendingDefault;
        this.setModeTriangles();
    };
    GLU.Material.prototype = {
        bind: function(){
            this.blendFunction();

            this.program.bind();

            this.bindTextures();
        },
        bindTextures: function(){
            var gl = this.gl;
            var textureCount = 0;
            for (var uniformName in this.textures){
                var texture = this.textures[uniformName];
                gl.activeTexture(this.getGLTextureSlot(textureCount));
                texture.bind();
                gl.uniform1i(this.program[uniformName], textureCount);
                ++textureCount;
            }
        },
        unbindTextures: function(){
            var textureCount = 0;
            var gl = this.gl;
            for (var uniformName in this.textures){
                var texture = this.textures[uniformName];
                gl.activeTexture(this.getGLTextureSlot(textureCount));
                texture.unbind();
                ++textureCount;
            }
        },
        getGLTextureSlot: function(id){
            var slotName = 'TEXTURE' + id;
            return this.gl[slotName]; //e.g. gl.TEXTURE4
        },
        unbind: function(){
            this.unbindTextures();
            this.program.unbind();
        },
        blendingDefault: function(){
            var gl = this.gl;
            gl.enable(gl.BLEND);
            gl.enable(gl.DEPTH_TEST);
            gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);
            gl.enable(gl.CULL_FACE);
            gl.cullFace(gl.BACK);
        },
        blendingDoubleSided: function(){
            var gl = this.gl;
            gl.enable(gl.BLEND);
            gl.enable(gl.DEPTH_TEST);
            gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);
            gl.disable(gl.CULL_FACE);
        },
        blendingParticles: function(){
            var gl = this.gl;
            gl.enable(gl.BLEND);
            gl.disable(gl.DEPTH_TEST);
            gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);
            gl.disable(gl.CULL_FACE);
        },
        setModeTriangles: function(){
            this.drawMode = this.gl.TRIANGLES;
        },
        setModeLines: function(){
            this.drawMode = this.gl.LINES;
        },
        setModePoints: function(){
            this.drawMode = this.gl.POINTS;
        }
    };


    GLU.Geometry = function(gl, buffers){
        GLU.Core.apply(this, [gl]);
        this.buffers = buffers || {};
        this.indices = null;
    };
    GLU.Geometry.prototype = {
        makeRect: function(width, height, color, vertexName, texName, colorName, normalName){
            width = width || 1;
            height = height || 1;
            color = color || {
                r: 1,
                g: 1,
                b: 1,
                a: 1
            };
            vertexName = vertexName || 'aVertexPosition';
            texName = texName || 'aTextureCoord';
            colorName = colorName || 'aColor';
            normalName = normalName || 'aNormal';

            var halfw = width / 2;
            var halfh = height / 2;

            var vertexArray = [-halfw, -halfh, 0, halfw, -halfh, 0, halfw, halfh, 0, -halfw, halfh, 0];
            var normalArray = [0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0];
            var texArray = [0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0];
            var indexArray = [0, 1, 2, 0, 2, 3];
            var colorArray = [];
            for (var i = 0; i < 4; ++i){
                colorArray.push(color.r, color.g, color.b, color.a);
            }
            this.makeFromArrays(indexArray, vertexArray, vertexName, texArray, texName, colorArray, colorName, normalArray, normalName);
        },
        makeSphere: function(segmentsH, segmentsV, radius, color, vertexName, texName, colorName, normalName){
            segmentsH = segmentsH || 16;
            segmentsV = segmentsV || 8;
            radius = radius || 1;
            color = color || {
                r: 1,
                g: 1,
                b: 1,
                a: 1
            };

            vertexName = vertexName || 'aVertexPosition';
            texName = texName || 'aTextureCoord';
            colorName = colorName || 'aColor';
            normalName = normalName || 'aNormal';

            var vertexArray = [];
            var texArray = [];
            var indexArray = [];
            var colorArray = [];
            var normalArray = [];

            for (var j = 0; j <= segmentsV; ++j){
                var thetaV = Math.PI * (1 - j / segmentsV);

                var ringX = Math.sin(thetaV); //radius of ring
                var ringY = Math.cos(thetaV); //Y position of ring
                for (var i = 0; i <= segmentsH; ++i){
                    var thetaH = 2 * Math.PI * (1 - i / segmentsH);
                    var x = ringX * Math.cos(thetaH);
                    var z = ringX * Math.sin(thetaH);
                    var y = ringY;
                    vertexArray.push(radius * x, radius * y, radius * z);
                    texArray.push(i / segmentsH, j / segmentsV);
                    colorArray.push(color.r, color.g, color.b, color.a);
                    normalArray.push(x, y, z);
                }
            }

            var rowSize = segmentsH + 1;
            for (var j = 0; j < segmentsV; ++j){
                var row0 = j * rowSize;
                var row1 = row0 + rowSize;
                for (var i = 0; i < segmentsH; ++i){
                    var a = row0 + i;
                    var b = a + 1;
                    var d = row1 + i;
                    var c = d + 1;
                    indexArray.push(a, b, c, a, c, d);
                }
            }
            this.makeFromArrays(indexArray, vertexArray, vertexName, texArray, texName, colorArray, colorName, normalArray, normalName);
        },
        makeCube: function(width, height, depth, color, vertexName, texName, colorName, normalName){
            width = width || 1;
            height = height || 1;
            depth = depth || 1;
            color = color || {
                r: 1,
                g: 1,
                b: 1,
                a: 1
            };

            if (Object.prototype.toString.call(color) !== '[object Array]'){
                var array = [];
                for (var i = 0; i < 6; ++i){
                    array.push(color);
                }
                color = array;
            }

            vertexName = vertexName || 'aVertexPosition';
            texName = texName || 'aTextureCoord';
            colorName = colorName || 'aColor';
            normalName = normalName || 'aNormal';

            var vertexArray = [
                -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, //front
                -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, //back
                -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, //top
                -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, //bottom
                1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, //right
                -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0 //left
            ];

            for (var i = 0; i < vertexArray.length; i += 3){
                vertexArray[i] *= width * 0.5;
                vertexArray[i + 1] *= height * 0.5;
                vertexArray[i + 2] *= depth * 0.5;
            }
            var texArray = [];
            var normalArray = [];
            var colorArray = [];
            for (var i = 0; i < 6; ++i){
                var axis = Math.floor(i / 2);
                var sign = 1 - (i % 2) * 2;
                var normal = [];
                for (var j = 0; j < 3; ++j){
                    var val = j == axis ? 1 : 0;
                    normal.push(val * sign);
                }
                var faceColor = color[i];

                texArray.push(0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0);
                for (var j = 0; j < 4; ++j){
                    colorArray.push(faceColor.r, faceColor.g, faceColor.b, faceColor.a);
                    normalArray.push(normal[0], normal[1], normal[2]);
                }
            }

            var indexArray = [
                0, 1, 2, 0, 2, 3, //front
                4, 5, 6, 4, 6, 7, //back
                8, 9, 10, 8, 10, 11, //top
                12, 13, 14, 12, 14, 15, //bottom
                16, 17, 18, 16, 18, 19, //right
                20, 21, 22, 20, 22, 23 //left
            ];

            this.makeFromArrays(indexArray, vertexArray, vertexName, texArray, texName, colorArray, colorName, normalArray, normalName);
        },
        makeFromArrays: function(indexArray, vertexArray, vertexName, texArray, texName, colorArray, colorName, normalArray, normalName){
            var gl = this.gl;
            var merged = this.mergePoints(0.0001, indexArray, vertexArray, texArray, colorArray, normalArray);
            indexArray = merged[0];

            vertexArray = vertexArray && merged[1];
            texArray = texArray && merged[2];
            colorArray = colorArray && merged[3];
            normalArray = normalArray && merged[4];

            if (indexArray){
                var indexBuffer = new GLU.Buffer(gl, gl.ELEMENT_ARRAY_BUFFER, gl.UNSIGNED_SHORT, 1, gl.STATIC_DRAW);
                indexBuffer.setArray(indexArray);
                this.indices = indexBuffer;
            }
            if (vertexArray && vertexName){
                var vertexBuffer = new GLU.Buffer(gl, gl.ARRAY_BUFFER, gl.FLOAT, 3, gl.STATIC_DRAW);
                vertexBuffer.setArray(vertexArray);
                this.buffers[vertexName] = vertexBuffer;
            }
            if (texArray && texName){
                var texBuffer = new GLU.Buffer(gl, gl.ARRAY_BUFFER, gl.FLOAT, 2, gl.STATIC_DRAW);
                texBuffer.setArray(texArray);
                this.buffers[texName] = texBuffer;
            }
            if (colorArray && colorName){
                var colorBuffer = new GLU.Buffer(gl, gl.ARRAY_BUFFER, gl.FLOAT, 4, gl.STATIC_DRAW);
                colorBuffer.setArray(colorArray);
                this.buffers[colorName] = colorBuffer;
            }
            if (normalArray && normalName){
                var normalBuffer = new GLU.Buffer(gl, gl.ARRAY_BUFFER, gl.FLOAT, 3, gl.STATIC_DRAW);
                normalBuffer.setArray(normalArray);
                this.buffers[normalName] = normalBuffer;
            }
        },
        mergePoints: function(precision, indexArray, vertexArray, texArray, colorArray, normalArray){
            precision = precision || 0;
            vertexArray = vertexArray || [];
            texArray = texArray || [];
            colorArray = colorArray || [];
            normalArray = normalArray || [];

            var newIArray = [];
            var newVArray = [];
            var newTArray = [];
            var newCArray = [];
            var newNArray = [];

            var lookup = {};
            var uniques = [];

            var oldLength = vertexArray.length / 3;

            for (var i = 0; i < indexArray.length; ++i){
                var index = indexArray[i];
                var identity = {
                    vx: vertexArray[index * 3],
                    vy: vertexArray[index * 3 + 1],
                    vz: vertexArray[index * 3 + 2],

                    tx: texArray[index * 2],
                    ty: texArray[index * 2 + 1],

                    cr: colorArray[index * 4],
                    cg: colorArray[index * 4 + 1],
                    cb: colorArray[index * 4 + 2],
                    ca: colorArray[index * 4 + 3],

                    nx: normalArray[index * 3],
                    ny: normalArray[index * 3 + 1],
                    nz: normalArray[index * 3 + 2]
                };
                var rounded = {};
                for (var s in identity){
                    if (precision){
                        rounded[s] = Math.round(identity[s] / precision);
                    } else {
                        rounded[s] = identity[s];
                    }
                }
                var identityString = JSON.stringify(rounded);
                var id;
                if (!lookup.hasOwnProperty(identityString)){
                    id = uniques.length;
                    lookup[identityString] = id;
                    uniques.push(identity);
                } else {
                    id = lookup[identityString];
                }

                newIArray.push(id);
            }

            for (var i = 0; i < uniques.length; ++i){
                var unique = uniques[i];
                newVArray.push(unique.vx, unique.vy, unique.vz);
                newTArray.push(unique.tx, unique.ty);
                newCArray.push(unique.cr, unique.cg, unique.cb, unique.ca);
                newNArray.push(unique.nx, unique.ny, unique.nz);
            }

            return [newIArray, newVArray, newTArray, newCArray, newNArray];
        }
    };


    GLU.Object = function(gl, geometry, material, uniforms){
        GLU.Core.apply(this, [gl]);
        this.geometry = geometry || {};
        this.material = material;
        this.uniforms = uniforms || [];
    };
    GLU.Object.prototype = {
        bind: function(){
            var gl = this.gl;
            this.material.bind();

            //bind buffers
            var buffers = this.geometry.buffers;
            for (var attribName in this.geometry.buffers){
                var buffer = this.geometry.buffers[attribName];
                buffer.bind();
                var position = this.material.program[attribName];
                if (position !== undefined){
                    gl.vertexAttribPointer(position, buffer.itemSize, buffer.dataType, false, 0, 0);
                }
            }

            for (var i = 0; i < this.uniforms.length; ++i){
                var uniform = this.uniforms[i];
                this.updateUniform(uniform);
            }

            this.geometry.indices.bind();

        },
        unbind: function(){
            this.geometry.indices.unbind();

            var buffers = this.geometry.buffers;
            for (var attribName in this.geometry.buffers){
                var buffer = this.geometry.buffers[attribName];
                buffer.unbind();
            }
            this.material.unbind();

        },
        updateUniform: function(uniform){
            uniform.bind(this.material.program);
        },
        draw: function(){
            this.drawNum(this.geometry.indices.length);
        },
        drawNum: function(num){
            this.gl.drawElements(this.material.drawMode, num, this.geometry.indices.dataType, 0);
        }
    };


    GLU.Framebuffer = function(gl){
        GLU.Core.apply(this, [gl]);
        var width = 512;
        var height = 512;

        var framebuffer = this.framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        framebuffer.width = width;
        framebuffer.height = height;

        var texture = this.texture = new GLU.Texture(gl);
        var renderbuffer = this.renderbuffer = gl.createRenderbuffer();

        this.setSize(width, height);

        gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);

        this.checkRenderbuffer(renderbuffer);

        texture.bind();

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture.texture, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);

        this.checkFramebuffer(framebuffer);

        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        texture.unbind();
    };
    GLU.Framebuffer.prototype = {
        bind: function(){
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
        },
        unbind: function(){
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        },
        setSize: function(width, height){
            var gl = this.gl;

            this.texture.setupRenderBuffer(width, height);

            gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderbuffer);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
            gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        },
        checkRenderbuffer: function(renderbuffer){
            if (!this.gl.isRenderbuffer(renderbuffer)){
                throw GLU.Error.FrameBuffer("Invalid renderbuffer");
            }
        },
        checkFramebuffer: function(framebuffer){
            var gl = this.gl;
            if (!gl.isFramebuffer(framebuffer)){
                throw GLU.Error.Framebuffer("Invalid framebuffer");
            }
            var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
            var statusErrorString;
            switch (status){
            case gl.FRAMEBUFFER_COMPLETE:
                break;
            case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
                statusErrorString = "FRAMEBUFFER_INCOMPLETE_ATTACHMENT";
                break;
            case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
                statusErrorString = "FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT";
                break;
            case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
                statusErrorString = "FRAMEBUFFER_INCOMPLETE_DIMENSIONS";
                break;
            case gl.FRAMEBUFFER_UNSUPPORTED:
                statusErrorString = "FRAMEBUFFER_UNSUPPORTED";
                break;
            default:
                statusErrorString = status;
            }
            if (statusErrorString){
                throw GLU.Error.Framebuffer("Incomplete framebuffer: " + statusErrorString);
            }
        }
    };

}(this));