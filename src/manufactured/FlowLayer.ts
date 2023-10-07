import { CustomLayerInterface } from "mapbox-gl";
import { DataManager } from "./DataManager";
import { rand,ShaderObj } from '@/utils/common' 
import axios from "axios";
export class FlowLayer implements CustomLayerInterface {
    // basic params 
    id:any;
    type:any;
    renderingMode:any;
    GL:WebGL2RenderingContext|null = null;
    dataManager:DataManager;
    isPrepared:boolean = false;
    isAllBlocksReady:boolean = false;
    beginBlock:number = -1;
    Counter:number = 0;
    map:mapboxgl.Map | null = null;

    //time counter params 
    timeline :number = 0;
    _progressRate :number = 0.0;
    phaseCount:number = 0.0; //the texture Num
    timePoint :number = -1.0; //one render call , one timepoint++ , should keeped in [0,phasecount*150]
    deltaProgress :number = 0.0;  //the uniformBlockData[0]

    // computed params
    offsetArray : Array<{Xoffset:number,Yoffset:number}> = [];
    textureArraySize: number = 0;

    // webgl params for preparing simulating & rendering
    uniformBlockData:Float32Array|null = null;
    particleInfoData:Float32Array|null = null;
    particleLifeData:Float32Array|null = null;

    flowFieldTextureArray:Array<WebGLTexture> = [];
    seedingTextrureArray:Array<WebGLTexture> = [];
    transformTexture:WebGLTexture = 0;

    trajectoryPoolTexture:WebGLTexture = 0;

    SVAO:WebGLVertexArrayObject = 0;
    RVAO:WebGLVertexArrayObject = 0;
    XFO:WebGLTransformFeedback = 0;
    InfoBO:WebGLBuffer = 0;
    lifeBO:WebGLBuffer = 0;

    SVAO2:WebGLVertexArrayObject = 0;
    RVAO2:WebGLVertexArrayObject = 0;
    XFO2:WebGLTransformFeedback = 0;
    InfoBO2:WebGLBuffer = 0;
    lifeBO2:WebGLBuffer = 0;

    
    UBO:WebGLBuffer = 0;

    UpdateShader:ShaderObj|null = null;
    TrajectoryShader:ShaderObj|null = null;
  

    FFTextureforUse:Array<WebGLTexture> = [];//flowfieldTex for use
    SDTextureforUse:Array<WebGLTexture> = [];//seedingTex for use
    
    SVAOforUse:WebGLVertexArrayObject = 0;
    RVAOforUse:WebGLVertexArrayObject = 0;
    XFOforUse:WebGLTransformFeedback = 0;
    XFBOforUse:WebGLBuffer = 0;


    constructor(dtm:DataManager){
        this.id = 'null-island';
        this.type = 'custom';
        this.renderingMode = '2d';
        this.dataManager = dtm;
    }


    //storage level ----1
    //texsubimg level --0

    // get progressRate(){
    //     return this._progressRate;
    // }
    // set progressRate(value:number){
    //     //a new render call , a new pregressRate
    //     //update the FFTextureforUse , SDTextureforUse 
    //     //if not the end , update the flowFieldTextureArray,seedingTextrureArray from images

    //     // timePoint === progressRate * timeline
    //     // phase === progressRate * phaseCount
    //     const lastPhase = Math.ceil(getProgressRate() * this.phaseCount); 
    //     const nowPhase  = Math.ceil(value * this.phaseCount); 
    //     const nextPhase = Math.ceil((nowPhase + 1) % this.phaseCount);

    //     this.FFTextureforUse[0] = this.flowFieldTextureArray[nowPhase%this.textureArraySize];
    //     this.FFTextureforUse[1] = this.flowFieldTextureArray[nextPhase%this.textureArraySize];

    //     this.SDTextureforUse[0] = this.seedingTextrureArray[nowPhase%this.textureArraySize];
    //     this.SDTextureforUse[1] = this.seedingTextrureArray[nextPhase%this.textureArraySize];

    //     if(nowPhase != lastPhase){
    //         //注意这里的循环数组 每次把nextphase位置放上一张新的纹理
    //         // update textureArray
    //         let gl:WebGL2RenderingContext = this.GL!;

    //         let newfftex = gl.createTexture()!;
    //         gl.bindTexture(gl.TEXTURE_2D,newfftex);
    //             gl.texStorage2D(gl.TEXTURE_2D,1,gl.RG32F,
    //                 this.dataManager.flowFieldTextureSize[0],this.dataManager.flowFieldTextureSize[1]);
    //             this.FillTextureByImage(gl,newfftex,gl.RG32F,gl.NEAREST,
    //                 this.dataManager.flowFieldTextureSize[0],this.dataManager.flowFieldTextureSize[1],
    //                 this.dataManager.flowFieldTextureSrcArray[nextPhase]);
    //             //cannot await in set
    //             this.FFTextureforUse[nextPhase%this.textureArraySize] = newfftex;
    //         gl.bindTexture(gl.TEXTURE_2D,null);
    //         let delfftex = this.flowFieldTextureArray[lastPhase%this.textureArraySize];
    //         gl.deleteTexture(delfftex!);


    //         let newsdtex = gl.createTexture()!;
    //         gl.bindTexture(gl.TEXTURE_2D,newsdtex);
    //             gl.texStorage2D(gl.TEXTURE_2D,1,gl.RGBA8,
    //                 this.dataManager.seedingTextureSize[0],this.dataManager.seedingTextureSize[1]);
    //             this.FillTextureByImage(gl,newsdtex,gl.RGBA8,gl.LINEAR,
    //                 this.dataManager.seedingTextureSize[0],this.dataManager.seedingTextureSize[1],
    //                 this.dataManager.seedingTextureSrcArray[nextPhase%this.textureArraySize]);
    //             this.SDTextureforUse[nextPhase%this.textureArraySize] = newsdtex;
    //         gl.bindTexture(gl.TEXTURE_2D,null);
    //         let delsdtex = this.seedingTextrureArray[lastPhase%this.textureArraySize];
    //         gl.deleteTexture(delsdtex!);
            
    //     }        

    //     this._progressRate = value;
    //     //pass
    // }

    getProgressRate(){
        return this._progressRate;
    }

    // 'set progressRate' needs to be a asynchronous function . It need to wait the loaded image
    async setProgressRate(value:number){

        const lastPhase = Math.floor(this.getProgressRate() * this.phaseCount) % this.phaseCount; 
        const nowPhase  = Math.floor(value * this.phaseCount) % this.phaseCount; 
        const nextPhase = ((nowPhase + 1) % this.phaseCount);

        //get used texture from texArray
        this.FFTextureforUse[0] = this.flowFieldTextureArray[nowPhase%this.textureArraySize];
        this.FFTextureforUse[1] = this.flowFieldTextureArray[nextPhase%this.textureArraySize];

        this.SDTextureforUse[0] = this.seedingTextrureArray[nowPhase%this.textureArraySize];
        this.SDTextureforUse[1] = this.seedingTextrureArray[nextPhase%this.textureArraySize];

        let temp = value * this.phaseCount;
        this.deltaProgress = temp - Math.floor(temp);
        // console.log('deltaProgress::'+this.deltaProgress);
        
        this.uniformBlockData![0] = this.deltaProgress;


        if(nowPhase != lastPhase){
            //注意这里的循环数组 每次把nextphase位置放上一张新的纹理
            // update textureArray
            let gl:WebGL2RenderingContext = this.GL!;
            let index = nextPhase % this.textureArraySize;

            // let newfftex = gl.createTexture()!;
            // gl.bindTexture(gl.TEXTURE_2D,newfftex);
            //     gl.texStorage2D(gl.TEXTURE_2D,1,gl.RG32F,
            //         this.dataManager.flowFieldTextureSize[0],this.dataManager.flowFieldTextureSize[1]);
            //     await this.FillTextureByImage(gl,newfftex,gl.RG32F,gl.NEAREST,
            //         this.dataManager.flowFieldTextureSize[0],this.dataManager.flowFieldTextureSize[1],
            //         this.dataManager.flowFieldTextureSrcArray[nextPhase]);
            //     this.FFTextureforUse[nextPhase%this.textureArraySize] = newfftex;
            // gl.bindTexture(gl.TEXTURE_2D,null);

            // let delfftex = this.flowFieldTextureArray[lastPhase%this.textureArraySize];
            // gl.deleteTexture(delfftex!);


            
            this.FillTextureByImage(gl,this.flowFieldTextureArray[index],gl.RG32F,gl.LINEAR,
                this.dataManager.flowFieldTextureSize[0],this.dataManager.flowFieldTextureSize[1],
                this.dataManager.flowFieldTextureSrcArray[nextPhase]);
                         

            ////

            // let newsdtex = gl.createTexture()!;
            // gl.bindTexture(gl.TEXTURE_2D,newsdtex);
            //     gl.texStorage2D(gl.TEXTURE_2D,1,gl.RGBA8,
            //         this.dataManager.seedingTextureSize[0],this.dataManager.seedingTextureSize[1]);
            //     await this.FillTextureByImage(gl,newsdtex,gl.RGBA8,gl.LINEAR,
            //         this.dataManager.seedingTextureSize[0],this.dataManager.seedingTextureSize[1],
            //         this.dataManager.seedingTextureSrcArray[nextPhase%this.textureArraySize]);
            //     this.SDTextureforUse[nextPhase%this.textureArraySize] = newsdtex;
            // gl.bindTexture(gl.TEXTURE_2D,null);

            // let delsdtex = this.seedingTextrureArray[lastPhase%this.textureArraySize];
            // gl.deleteTexture(delsdtex!);


            
            this.FillTextureByImage(gl,this.flowFieldTextureArray[index],gl.RGBA8,gl.NEAREST,
                this.dataManager.seedingTextureSize[0],this.dataManager.seedingTextureSize[1],
                this.dataManager.seedingTextureSrcArray[nextPhase%this.textureArraySize]);

            
        }        

        this._progressRate = value;
    }



    async FillTextureByImage(gl:WebGL2RenderingContext,Tex:WebGLTexture,internalformat:number
        ,filter:number,width:number,height:number,imgSrc:string){
        
        //pass
        if(internalformat === gl.RG32F){
            //get image in blob type
            //generate bitmap
            //create framebuffer 
            //create rgba8 texture by bitmap as a colorattachment
            //read pixel
            //get pixeldata
            //fill texture by pixelData

            axios.get(imgSrc,{responseType:'blob'})
            .then((response)=>{
                createImageBitmap(response.data,{imageOrientation:'flipY',
                    premultiplyAlpha:'none',colorSpaceConversion:'default'})
                .then((bitmap)=>{
                    
                    const pixelData = new Uint8Array(bitmap.width*bitmap.height*4);
                    const ofsCanvas = new OffscreenCanvas(bitmap.width,bitmap.height);
                    const ofsGL = ofsCanvas.getContext('webgl2')!;

                    const FB = ofsGL.createFramebuffer();
                    ofsGL.bindFramebuffer(ofsGL.FRAMEBUFFER,FB);

                    const ofsTex = ofsGL.createTexture();
                    ofsGL.bindTexture(ofsGL.TEXTURE_2D,ofsTex);
                    ofsGL.texImage2D(ofsGL.TEXTURE_2D,0,ofsGL.RGBA8,bitmap.width,bitmap.height,
                            0,ofsGL.RGBA,ofsGL.UNSIGNED_BYTE,bitmap);
                    ofsGL.texParameteri(ofsGL.TEXTURE_2D,ofsGL.TEXTURE_MAG_FILTER,ofsGL.LINEAR);
                    ofsGL.texParameteri(ofsGL.TEXTURE_2D,ofsGL.TEXTURE_MIN_FILTER,ofsGL.LINEAR);
                
                    ofsGL.framebufferTexture2D(ofsGL.FRAMEBUFFER,ofsGL.COLOR_ATTACHMENT0,ofsGL.TEXTURE_2D,ofsTex,0);
                    ofsGL.readPixels(0,0,bitmap.width,bitmap.height,ofsGL.RGBA,ofsGL.UNSIGNED_BYTE,pixelData);
                    
                    ofsGL.bindTexture(ofsGL.TEXTURE_2D,null);
                    ofsGL.bindFramebuffer(ofsGL.FRAMEBUFFER,null);
                    ofsGL.deleteTexture(ofsTex);
                    ofsGL.deleteFramebuffer(FB);
                    ofsGL.finish();

                    //get pixelData.buffer
                    gl.bindTexture(gl.TEXTURE_2D,Tex);
                    gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,width,height,gl.RG,gl.FLOAT,new Float32Array(pixelData.buffer));

                    gl.bindTexture(gl.TEXTURE_2D,null);
                    gl.finish();

                }).catch((e)=>{
                    console.log('ERROR::FillTextureByImage CREATEIMAGEBITMAP ERROR'+e);
                })
                    
            }).catch((e)=>{
                console.log('ERROR::FillTextureByImage GET IMG ERROR'+e);
            })

        }

        if(internalformat === gl.RGBA8){
            //get image in blob type
            //generate bitmap
            //fill texture by bitmap
            axios.get(imgSrc,{responseType:'blob'})
            .then((response)=>{
                createImageBitmap(response.data,{imageOrientation:'flipY',
                    premultiplyAlpha:'none',colorSpaceConversion:'default'})
                .then((bitmap)=>{
                    gl.bindTexture(gl.TEXTURE_2D,Tex);
                    gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);
                    
                    gl.bindTexture(gl.TEXTURE_2D,null);
                    gl.finish();
                }).catch((e)=>{
                    console.log('ERROR::FillTextureByImage CREATEIMAGEBITMAP ERROR'+e);
                })

            }).catch((e)=>{
                console.log('ERROR::FillTextureByImage GET IMG ERROR'+e);
                
            })


        }


        return Tex;
    }
    

    async getShaderObj(gl:WebGL2RenderingContext,vertexShaderSRCURL:string,fragmentShaderSRCURL:string,
        transformFeedbackVaryings?:Array<string>){
        
        let V_src:string = '';
        let F_src:string = '';
        let Vshader:WebGLShader;
        let Fshader:WebGLShader;
        let program:WebGLProgram;
        await axios.get(vertexShaderSRCURL).then(res=>{
            V_src = res.data;
        }).catch((e)=>{
            console.log('ERROR::getShaderObj vertexShaderSRCURL ERROR'+e);
        })

        await axios.get(fragmentShaderSRCURL).then(res=>{
            F_src = res.data;
        }).catch((e)=>{
            console.log('ERROR::getShaderObj vertexShaderSRCURL ERROR'+e);
        })

        if(V_src!='' && F_src!=''){
            Vshader = gl.createShader(gl.VERTEX_SHADER)!;
            gl.shaderSource(Vshader,V_src);
            gl.compileShader(Vshader);
            if(!gl.getShaderParameter(Vshader,gl.COMPILE_STATUS))
                console.log(gl.getShaderInfoLog(Vshader));
            
            Fshader = gl.createShader(gl.FRAGMENT_SHADER)!;
            gl.shaderSource(Fshader,F_src);
            gl.compileShader(Fshader);
            if(!gl.getShaderParameter(Fshader,gl.COMPILE_STATUS))
                console.log(gl.getShaderInfoLog(Fshader));

            program = gl.createProgram()!;
            gl.attachShader(program,Vshader);
            gl.attachShader(program,Fshader);

            if (transformFeedbackVaryings && (transformFeedbackVaryings!).length != 0) {
                gl.transformFeedbackVaryings(
                    program!, 
                    transformFeedbackVaryings!,
                    gl.SEPARATE_ATTRIBS
                );
            }
            gl.linkProgram(program);
            if(!gl.getProgramParameter(program,gl.LINK_STATUS))
                console.log(gl.getProgramInfoLog(program));
                
        }else{
            console.log('ERROR::getShaderObj');
        }
        
        const result:ShaderObj = {
            VertexShader:Vshader!,
            FragmentShader:Fshader!,
            Program:program!,
        }
        return result;

    }

    async FilloneBlockByXFBO(gl:WebGL2RenderingContext,Tex:WebGLTexture,XFBO:WebGLBuffer){
        gl.bindTexture(gl.TEXTURE_2D,Tex);
        gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER,XFBO);
        // console.log('this.maxblocksize::'+this.dataManager.maxBlockSize);
        
        gl.texSubImage2D(gl.TEXTURE_2D,0,
            this.offsetArray[this.beginBlock].Xoffset,
            this.offsetArray[this.beginBlock].Yoffset,
            this.dataManager.maxBlockSize,
            this.dataManager.maxBlockSize,
            gl.RGB,gl.FLOAT,0);
        gl.bindTexture(gl.TEXTURE_2D,null);
        gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER,null);
    }


    swap(){
        if (this.beginBlock % 2 === 0) {
            this.SVAOforUse = this.SVAO;
            this.RVAOforUse = this.RVAO;
            this.XFOforUse = this.XFO;
            this.XFBOforUse = this.InfoBO;

        }else{
            this.SVAOforUse = this.SVAO2;
            this.RVAOforUse = this.RVAO2;
            this.XFOforUse = this.XFO2;
            this.XFBOforUse = this.InfoBO2;
        }
        
    }



    async onAdd(map:mapboxgl.Map,gl:WebGL2RenderingContext){
        this.map = map;
        this.Counter = this.dataManager.maxSegmentNum;
        this.GL = gl;
        const extensions = gl.getSupportedExtensions()!;
        for (let ext of extensions!){
            gl.getExtension(ext);
        }

        this.phaseCount = this.dataManager.flowFieldTextureSrcArray.length;
        this.timeline = this.phaseCount * 150;
        


        this.uniformBlockData = new Float32Array(12); //12 float , 48 bytes for uniform block in shaders
        //this.uniformBlockData[0] is the progressRate * phaseCount
        this.uniformBlockData[1] = 16.0;
        this.uniformBlockData[2] = 16.0 * 10;
        this.uniformBlockData[3] = this.dataManager.dropRate;
        this.uniformBlockData[4] = this.dataManager.dropRateBump;
        this.uniformBlockData[5] = this.dataManager.speedFactor;
        this.uniformBlockData[6] = this.dataManager.colorScheme;
 
        //unifromblock  layout(std140) will resolve the problem of missing [7] & [6]  --内存对齐策略
        this.uniformBlockData[8] = this.dataManager.flowBoundary[0];
        this.uniformBlockData[9] = this.dataManager.flowBoundary[1];
        this.uniformBlockData[10] = this.dataManager.flowBoundary[2];
        this.uniformBlockData[11] = this.dataManager.flowBoundary[3];

 
        this.UBO = gl.createBuffer()!; 
         
        gl.bindBuffer(gl.UNIFORM_BUFFER, this.UBO);
        gl.bufferData(gl.UNIFORM_BUFFER, 48, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.UNIFORM_BUFFER, null)


        this.particleInfoData = new Float32Array(this.dataManager.maxParticleNum_OneBlock * 3);
        this.particleLifeData = new Float32Array(this.dataManager.maxParticleNum_OneBlock);
        
        for(let i = 0 ;i<this.dataManager.maxParticleNum_OneBlock;i++){
            this.particleInfoData[ i*3 + 0] = rand(0,1);
            this.particleInfoData[ i*3 + 1] = rand(0,1);
            this.particleInfoData[ i*3 + 2] = 0;
            
            this.particleLifeData[ i      ] = this.dataManager.maxSegmentNum * 9.0; //why?
        }

        //offsetArray
        for(let i = 0;i < this.dataManager.maxSegmentNum; i++){
            let ofx , ofy;
            ofx = (i%this.dataManager.maxBlockColumns)*(this.dataManager.maxBlockSize);
            ofy = Math.floor(i/this.dataManager.maxBlockColumns)*(this.dataManager.maxBlockSize);

            this.offsetArray.push({
                Xoffset:ofx,
                Yoffset:ofy,
            });
        }


        this.textureArraySize = 3;
        for(let i = 0 ;i<this.textureArraySize ; i++){

            let ff_tex = gl.createTexture()!;
            gl.bindTexture(gl.TEXTURE_2D,ff_tex);
            gl.texStorage2D(gl.TEXTURE_2D,1,gl.RG32F,
                    this.dataManager.flowFieldTextureSize[0],
                    this.dataManager.flowFieldTextureSize[1]);
            gl.bindTexture(gl.TEXTURE_2D,null);

            await this.FillTextureByImage(gl,ff_tex,gl.RG32F,gl.LINEAR,
                    this.dataManager.flowFieldTextureSize[0],
                    this.dataManager.flowFieldTextureSize[1],
                    this.dataManager.flowFieldTextureSrcArray[i]);
            this.flowFieldTextureArray[i] = ff_tex;


            let seed_tex = gl.createTexture()!;
            gl.bindTexture(gl.TEXTURE_2D,seed_tex);
            gl.texStorage2D(gl.TEXTURE_2D,1,gl.RGBA8,
                    this.dataManager.seedingTextureSize[0],
                    this.dataManager.seedingTextureSize[1]);
            gl.bindTexture(gl.TEXTURE_2D,null);

            await this.FillTextureByImage(gl,seed_tex,gl.RGBA8,gl.NEAREST,
                    this.dataManager.seedingTextureSize[0],
                    this.dataManager.seedingTextureSize[1],
                    this.dataManager.seedingTextureSrcArray[i]);
            this.seedingTextrureArray[i] = seed_tex;

        }

        this.transformTexture = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D,this.transformTexture);
        gl.texStorage2D(gl.TEXTURE_2D,1,gl.RG32F,
                this.dataManager.transformTextureSize[0],
                this.dataManager.transformTextureSize[1]);
        gl.bindTexture(gl.TEXTURE_2D,null);
        
        await this.FillTextureByImage(gl,this.transformTexture,gl.RG32F,gl.LINEAR,
                this.dataManager.transformTextureSize[0],
                this.dataManager.transformTextureSize[1],
                this.dataManager.transformTexture2DSrc);

        this.InfoBO = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER,this.InfoBO);
        gl.bufferData(gl.ARRAY_BUFFER,this.particleInfoData,gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER,null);

        this.InfoBO2 = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER,this.InfoBO2);
        gl.bufferData(gl.ARRAY_BUFFER,this.particleInfoData,gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER,null);

        this.lifeBO = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER,this.lifeBO);
        gl.bufferData(gl.ARRAY_BUFFER,this.particleLifeData,gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER,null);

        this.lifeBO2 = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER,this.lifeBO2);
        gl.bufferData(gl.ARRAY_BUFFER,this.particleLifeData,gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER,null);


        this.SVAO = gl.createVertexArray()!;
        gl.bindVertexArray(this.SVAO);

            gl.bindBuffer(gl.ARRAY_BUFFER,this.InfoBO);
            gl.vertexAttribPointer(0,3,gl.FLOAT,false,3*4,0);//layout (location=0) in vec3 particleInfo
            gl.enableVertexAttribArray(0);
            
            gl.bindBuffer(gl.ARRAY_BUFFER,this.lifeBO)
            gl.vertexAttribPointer(1,1,gl.FLOAT,false,1*4,0);//layout (location=1) in float age
            gl.enableVertexAttribArray(1);

        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER,null);
        

        this.SVAO2 = gl.createVertexArray()!;
        gl.bindVertexArray(this.SVAO2);

        gl.bindBuffer(gl.ARRAY_BUFFER,this.InfoBO2);
        gl.vertexAttribPointer(0,3,gl.FLOAT,false,3*4,0);//layout (location=0) in vec3 particleInfo
        gl.enableVertexAttribArray(0);

        gl.bindBuffer(gl.ARRAY_BUFFER,this.lifeBO2);
        gl.vertexAttribPointer(1,1,gl.FLOAT,false,1*4,0);//layout (location=1) in float age
        gl.enableVertexAttribArray(1);
    
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER,null);

        this.XFO = gl.createTransformFeedback()!;
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,this.XFO);
        gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,this.InfoBO2);
        gl.bindBufferRange(gl.TRANSFORM_FEEDBACK_BUFFER,0,this.InfoBO2,0,this.dataManager.maxBlockSize*this.dataManager.maxBlockSize*4*3);//vec3
                                                    // 0 is binding point
        gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,this.lifeBO2);
        gl.bindBufferRange(gl.TRANSFORM_FEEDBACK_BUFFER,1,this.lifeBO2,0,this.dataManager.maxBlockSize*this.dataManager.maxBlockSize*4);//age
                                                    // 1 is binding point 
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);
        gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,null);    
        

        this.XFO2 = gl.createTransformFeedback()!;
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,this.XFO2);
        gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,this.InfoBO);
        gl.bindBufferRange(gl.TRANSFORM_FEEDBACK_BUFFER,0,this.InfoBO,0,this.dataManager.maxBlockSize*this.dataManager.maxBlockSize*4*3);//vec3

        gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,this.lifeBO);
        gl.bindBufferRange(gl.TRANSFORM_FEEDBACK_BUFFER,1,this.lifeBO,0,this.dataManager.maxBlockSize*this.dataManager.maxBlockSize*4);//age

        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);
        gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,null);


        this.RVAO = gl.createVertexArray()!;
        gl.bindVertexArray(this.RVAO);
        gl.bindBuffer(gl.ARRAY_BUFFER,this.lifeBO);
        gl.vertexAttribPointer(0,1,gl.FLOAT,false,1*4,0);//layout (location = 0) in float isAlive;
        gl.vertexAttribDivisor(0,1);
        gl.enableVertexAttribArray(0);
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER,null);

        
        this.RVAO2 = gl.createVertexArray()!;
        gl.bindVertexArray(this.RVAO2);
        gl.bindBuffer(gl.ARRAY_BUFFER,this.lifeBO2);
        gl.vertexAttribPointer(0,1,gl.FLOAT,false,1*4,0);//layout (location = 0) in float isAlive;
        gl.vertexAttribDivisor(0,1);
        gl.enableVertexAttribArray(0);
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER,null);
        

        //shaderobj
        this.UpdateShader = await this.getShaderObj(gl,
            '/shaders/update.vert',
            '/shaders/update.frag',
            ['newInfo', 'aliveTime']);

        this.TrajectoryShader = await this.getShaderObj(gl,
            '/shaders/trajectory.noCulling.vert',
            '/shaders/trajectory.noCulling.frag');


            
        this.trajectoryPoolTexture = gl.createTexture()!;

        this.trajectoryPoolTexture = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D,this.trajectoryPoolTexture);
        gl.texStorage2D(gl.TEXTURE_2D,1,gl.RGB32F,this.dataManager.maxTextureSize,this.dataManager.maxTextureSize);
        gl.bindTexture(gl.TEXTURE_2D,null);
        // texStorage2D之后，才可用texSubImage2d来填充纹理

        //FILL EACH BLOCK BY particleInfoData
        for (let i = 0;i<this.dataManager.maxSegmentNum;i++){

            gl.bindTexture(gl.TEXTURE_2D,this.trajectoryPoolTexture);
            //在解码时的数据处理方式设置
            gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
            gl.texSubImage2D(gl.TEXTURE_2D,0,this.offsetArray[i].Xoffset,this.offsetArray[i].Yoffset
                ,this.dataManager.maxBlockSize,this.dataManager.maxBlockSize,gl.RGB,gl.FLOAT,this.particleInfoData);
            gl.bindTexture(gl.TEXTURE_2D,null);

        }

        gl.bindBuffer(gl.ARRAY_BUFFER,null);
        gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,null);
        gl.bindVertexArray(null);
        this.isPrepared = true;
        // console.log('prepare over');
        
    }   


    updateOneBlock(gl:WebGL2RenderingContext) {
        //simulate one block 
        this.beginBlock = (this.beginBlock+1)%this.dataManager.maxSegmentNum;
        //应先xf一回
        this.swap();
        
        this.timePoint = (this.timePoint+1) % this.timeline;
        // console.log('setProgressRate::'+this.timePoint / this.timeline);
        
        this.setProgressRate(this.timePoint / this.timeline);
        //uniformblock data OK

        gl.bindBuffer(gl.UNIFORM_BUFFER,this.UBO); 
        gl.bufferData(gl.UNIFORM_BUFFER,this.uniformBlockData,gl.DYNAMIC_DRAW);
        gl.bindBufferRange(gl.UNIFORM_BUFFER,0,this.UBO,0,48); // 0 is the binding point

        gl.bindVertexArray(this.SVAOforUse);
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,this.XFOforUse);

        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D,this.FFTextureforUse[0]);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D,this.FFTextureforUse[1]);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D,this.SDTextureforUse[0]);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D,this.SDTextureforUse[1]);

        let u_Location:WebGLUniformLocation = 0;
        let u_block_location:number = 0;

        gl.useProgram(this.UpdateShader!.Program);
        u_Location = gl.getUniformLocation(this.UpdateShader!.Program,'flowField')!;
        gl.uniform1iv(u_Location,[0,1]); // TEXTURE0 TEXTURE1
        u_Location = gl.getUniformLocation(this.UpdateShader!.Program,'mask')!;
        gl.uniform1iv(u_Location,[2,3]); // TEXTURE2 TEXTURE3
        u_Location = gl.getUniformLocation(this.UpdateShader!.Program,'randomSeed')!;
        gl.uniform1f(u_Location,Math.random());
        
        u_block_location = gl.getUniformBlockIndex(this.UpdateShader!.Program,'FlowFieldUniforms')!;
        gl.uniformBlockBinding(this.UpdateShader!.Program,u_block_location,0);


        gl.enable(gl.RASTERIZER_DISCARD);
        gl.beginTransformFeedback(gl.POINTS);
        gl.drawArrays(gl.POINTS,0,10000);
        //gl.drawArrays(gl.POINTS,0,this.dataManager.maxStreamlineNum);
        gl.endTransformFeedback();
        gl.disable(gl.RASTERIZER_DISCARD);

        gl.bindVertexArray(null);
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);

       ///// simulation has DONE for one block


        //fill the trajectorypooltex by the xfbo
        this.FilloneBlockByXFBO(gl,this.trajectoryPoolTexture,this.XFBOforUse);

        gl.bindVertexArray(null);
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);
        gl.finish();
        //fill all blocks
        if(this.Counter>0){
            this.Counter -- ;
            return;
        }
        this.isAllBlocksReady = true;
        // console.log('updateAllBlock nowrong!');
        
        
    }
    
    
    render(gl:WebGL2RenderingContext, matrix: number[]) {
        if(!this.isPrepared)        {this.map?.triggerRepaint(); return;}
        //update all block
        
        this.updateOneBlock(gl);
        if(!this.isAllBlocksReady)  {this.map?.triggerRepaint(); return;}

        gl.bindVertexArray(this.RVAO);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D,this.trajectoryPoolTexture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D,this.transformTexture);
        
        gl.disable(gl.DEPTH_TEST);
        let location:WebGLUniformLocation|null = null;
        let blockIndex:number = 0;
        gl.useProgram(this.TrajectoryShader!.Program);
        location = gl.getUniformLocation(this.TrajectoryShader!.Program,'particlePool');
        gl.uniform1i(location,0);
        location = gl.getUniformLocation(this.TrajectoryShader!.Program,'projectionTexture');
        gl.uniform1i(location,1);
        location = gl.getUniformLocation(this.TrajectoryShader!.Program,'blockNum');
        gl.uniform1i(location,this.dataManager.maxSegmentNum);
        location = gl.getUniformLocation(this.TrajectoryShader!.Program,'beginBlock');
        gl.uniform1i(location,this.beginBlock);
        location = gl.getUniformLocation(this.TrajectoryShader!.Program,'blockSize');
        gl.uniform1i(location,this.dataManager.maxBlockSize);
        location = gl.getUniformLocation(this.TrajectoryShader!.Program,'fillWidth');
        gl.uniform1f(location,this.dataManager.fillWidth);
        location = gl.getUniformLocation(this.TrajectoryShader!.Program,'aaWidth');
        gl.uniform1f(location,this.dataManager.aaWidth);
        location = gl.getUniformLocation(this.TrajectoryShader!.Program,'viewport');
        gl.uniform2f(location,gl.canvas.width,gl.canvas.height);
        location = gl.getUniformLocation(this.TrajectoryShader!.Program,'u_matrix');
        gl.uniformMatrix4fv(location, false, matrix);
        blockIndex = gl.getUniformBlockIndex(this.TrajectoryShader!.Program,'FlowFieldUniforms');
        gl.uniformBlockBinding(this.TrajectoryShader!.Program,blockIndex,0);

        
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,(this.dataManager.segmentNum - 1)*2 , this.dataManager.maxStreamlineNum);

        // gl.disable(gl.BLEND);
        gl.bindVertexArray(null);
        gl.bindTexture(gl.TEXTURE_2D,null);

        this.map?.triggerRepaint();
    }


}