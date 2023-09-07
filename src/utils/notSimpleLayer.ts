import {CustomLayerInterface} from 'mapbox-gl'
import {FlowFieldManager} from './FlowFieldManager';
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css';
import axios, { Axios } from 'axios'
import {rand} from '@/utils/common'

export class notSimpleLayer implements CustomLayerInterface {
    id:string;
    type:any ;
    renderingMode:any;
    ffManager:FlowFieldManager;
    parser:any;
    map:mapboxgl.Map | null = null;
    GL:WebGL2RenderingContext | null = null;

    uboMapBufferData:Float32Array = new Float32Array(12);
    phaseCount: number = 0.0;
    timeLast: number = 10.0;
    _timeCount: number = 0.0;   
    textureArraySize: number = 0;

    flowFieldTextureArr:Array<WebGLTexture> = [0,0,0];
    seedingTextureArr:Array<WebGLTexture> = [0,0,0];
    transformTexture:WebGLTexture = 0;

    now_FFTextureArr:Array<WebGLTexture> = [0,0];
    now_SeedTextureArr:Array<WebGLTexture> = [0,0];
    
    _progressRate = 0.0;

    // buffer
    particleMapBufferData: Float32Array = new Float32Array(0);

    simulationBuffer: WebGLBuffer = 0;
    xfSimulationBuffer: WebGLBuffer = 0;
    lifeBuffer: WebGLBuffer = 0;
    xfLifeBuffer: WebGLBuffer = 0;
    BO: WebGLBuffer = 0;

    simulationVAO: WebGLVertexArrayObject = 0;
    simulationVAO2: WebGLVertexArrayObject = 0; 
    sVAO:WebGLVertexArrayObject = 0;

    XFO:WebGLTransformFeedback = 0;
    XFO2:WebGLTransformFeedback = 0;
    xfBO:WebGLTransformFeedback = 0;

    trajectoryPool:WebGLTexture = 0;

    // updateShaderObj:{program:WebGLProgram,vertexShader:WebGLShader,fragmentShader:WebGLShader}
    updateShaderObj:any;
    trajectoryShaderObj:any;
    pointShaderObj:any;
    poolShaderObj:any;


    //render
    isReady:boolean = false;
    renderVAO:WebGLVertexArrayObject=0;
    renderVAO2:WebGLVertexArrayObject=0;
    textureOffsetArray:Array<{offsetX:number , offsetY:number}> = [];

    beginBlock:number = -1.0;
    now_sVAO:WebGLVertexArrayObject = 0;
    now_rVAO:WebGLVertexArrayObject =0 ;
    now_XFO:WebGLTransformFeedback = 0;//XF对象
    now_XFBO:WebGLBuffer = 0;//XF所用buffer

    constructor(ffManager:FlowFieldManager) {
        this.id = 'FlowLayer';
        this.type = 'custom';
        this.renderingMode = '2d';
        this.ffManager = ffManager;
    }

    set progressRate(value:number){
        //phaseCount is the texSrc NUM
        //progressRate is a number between 0 and 1 === timeCount / timeLast
        //phase is the progressRate * phaseCount   === textureSrc index 
        //new phase ---> checkout new texture

        const lastPhase = Math.floor(this._progressRate * this.phaseCount);
        //value would be (timecount+1)/timeLast
        const currentPhase =  Math.floor(value * this.phaseCount) % this.phaseCount;
        const nextPhase = (currentPhase + 2) % this.phaseCount; // +2 ？

        this._progressRate = value;
        
        const newCurrentPhase = Math.floor(this._progressRate * this.phaseCount);
        const newNextPhase = (newCurrentPhase+1) % this.phaseCount;
        this.now_FFTextureArr[0] = this.flowFieldTextureArr[newCurrentPhase%this.textureArraySize],
        this.now_FFTextureArr[1] = this.flowFieldTextureArr[newNextPhase%this.textureArraySize];
        this.now_SeedTextureArr[0] = this.seedingTextureArr[newCurrentPhase%this.textureArraySize],
        this.now_SeedTextureArr[1] = this.seedingTextureArr[newNextPhase%this.textureArraySize];
        
        let temp = this.progressRate * this.phaseCount;
        this.uboMapBufferData[0] = temp - Math.floor(temp);

        if(currentPhase != lastPhase){
            //checkout new texture
            let index = nextPhase % this.textureArraySize;
            let gl:WebGL2RenderingContext = this.GL!;
            this.UpdateTextureByImage(gl,this.flowFieldTextureArr[index],gl.RG,gl.LINEAR,
                 this.parser.flowFieldTexSize[0],this.parser.flowFieldTexSize[1],
                 this.parser.flowFieldResourceArr[nextPhase],'Float')
        }
    }

    get progressRate() {
        return this._progressRate;
    }

    set timeCount(value:number){
        this._timeCount = value%this.timeLast;
    }
    get timeCount(){
        return this._timeCount;
    }



    async init2ShadersFromSrc(gl:WebGL2RenderingContext,vertURL:string,fragURL:string,XF_Varings?:Array<string>){
        const vertSrc = await axios.get(vertURL)
        .then((response)=>{
            return response.data;
        }).catch((error)=>{
            console.log('ERROR::VERTEX_SHADER FILE NOT FOUND',error);
        })
        const fragSrc = await axios.get(fragURL)
        .then((response)=>{
            return response.data;
        }).catch((error)=>{
            console.log('ERROR::FRAGMENT_SHADER FILE NOT FOUND',error);
        })
        const Vshader = gl.createShader(gl.VERTEX_SHADER)!;
        gl.shaderSource(Vshader,vertSrc);
        gl.compileShader(Vshader);
        const Fshader = gl.createShader(gl.FRAGMENT_SHADER)!;
        gl.shaderSource(Fshader,fragSrc);
        gl.compileShader(Fshader);

        const program = gl.createProgram()!;
        gl.attachShader(program,Vshader);
        gl.attachShader(program,Fshader);

        // set transformfeedbackvaryings 
        if(XF_Varings){
            gl.transformFeedbackVaryings(program,XF_Varings,gl.SEPARATE_ATTRIBS);
        }

        gl.linkProgram(program);

        if(!gl.getProgramParameter(program,gl.LINK_STATUS)){
            //check 
            console.log(gl.getProgramInfoLog(program));
            return;
        }
        //这里的program需不需要记录？？不用shader对象的话，好不好记录？

        return {
            program,
            vertexShader:Vshader,
            fragmentShader:Fshader,
        }
    }


    async FillTextureByImage(gl:WebGL2RenderingContext,Tex:WebGLTexture,format:number,filter:number,width:number,height:number,imgSrc:string,type:string){
       
        if(type === 'Float'){
            const worker = new Worker(new URL('./readPixel.worker', import.meta.url));
            worker.postMessage([0,imgSrc]);
            worker.onmessage = (e)=>{
                gl.bindTexture(gl.TEXTURE_2D,Tex);
                gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,width,height,format,gl.FLOAT,new Float32Array(e.data));

                
                //generateMipmap ? 
                gl.bindTexture(gl.TEXTURE_2D,null);
                gl.finish();
                worker.postMessage([1]);
                worker.terminate();
            }
        }
        else {
            await axios.get(imgSrc,{responseType:'blob'})
            .then((response)=>{
                createImageBitmap(response.data,{imageOrientation: "flipY", premultiplyAlpha: "none", colorSpaceConversion: "default"})
                .then((bitmap)=>{
                    // console.log("SUCCESS::GET BLOB RESPONSE & CREATE BITMAP FOR UNSIGNED_BYTE TYPE");
                    gl.bindTexture(gl.TEXTURE_2D,Tex);
                    gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,width,height,format,gl.UNSIGNED_BYTE,bitmap);

                    
                    //generateMipmap ? 
                    gl.bindTexture(gl.TEXTURE_2D,null);
                    gl.finish();

                })
            })
        }

        
    }

    async UpdateTextureByImage(gl:WebGL2RenderingContext,Tex:WebGLTexture,format:number,filter:number,width:number,height:number,imgSrc:string,type:string){
        await this.FillTextureByImage(gl,Tex,format,filter,width,height,imgSrc,type);
    }

    FillBlockByData(gl:WebGL2RenderingContext,Tex:WebGLTexture,offsetX:number,offsetY:number,width:number,height:number,data:Float32Array){
        gl.bindTexture(gl.TEXTURE_2D,Tex);
        //在解码时的数据处理方式设置
        gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
        gl.texSubImage2D(gl.TEXTURE_2D,0,offsetX,offsetY,width,height,gl.RGB,gl.FLOAT,data)
        gl.bindTexture(gl.TEXTURE_2D,null);
    }


    swap(){
        if(this.beginBlock % 2 == 0){  
            this.now_sVAO = this.simulationVAO;
            this.now_rVAO = this.renderVAO;
            this.now_XFO = this.XFO;
            this.now_XFBO = this.simulationBuffer;
        }else{
            this.now_sVAO = this.simulationVAO2;
            this.now_rVAO = this.renderVAO2;
            this.now_XFO = this.XFO2;
            this.now_XFBO = this.xfSimulationBuffer;
        }
    }

    async prepare(gl:WebGL2RenderingContext) {

        //get gl extensions 
        const extensions = gl.getSupportedExtensions()!
        for (let ext of extensions) {
            gl.getExtension(ext);
        }

        //parser as a JsonFileParser and a data storage
        //just for short writing
        this.parser = this.ffManager.parser;
        // maxSegmentNum === segmentNum === segmentPrepare
        this.parser.segmentPrepare = this.ffManager.parser.maxSegmentNum;
        this.parser.segmentNum = this.ffManager.parser.maxSegmentNum;
        this.parser.maxBlockSize = Math.ceil(Math.sqrt(this.parser.maxTrajectoryNum));


        // why?
        // the last one is a phase from the end to the head
        this.phaseCount = this.parser.flowFieldResourceArr.length;
        this.timeLast = this.phaseCount * 150; // 150 frame per timePoint

        // why 3?
        this.textureArraySize = 3;

         for(var i=0;i<this.textureArraySize;i++){
            let ff_tex = gl.createTexture()!;
            gl.bindTexture(gl.TEXTURE_2D,ff_tex);
            gl.texStorage2D(gl.TEXTURE_2D,1,gl.RG32F,this.parser.flowFieldTexSize[0],this.parser.flowFieldTexSize[1]);
            gl.bindTexture(gl.TEXTURE_2D,null);
            await this.FillTextureByImage(gl,ff_tex,gl.RG,gl.LINEAR,this.parser.flowFieldTexSize[0],this.parser.flowFieldTexSize[1],this.parser.flowFieldResourceArr[i],'Float');
            this.flowFieldTextureArr[i]=(ff_tex);


            let seed_tex = gl.createTexture()!;
            gl.bindTexture(gl.TEXTURE_2D,seed_tex);
            gl.texStorage2D(gl.TEXTURE_2D,1,gl.RGBA8,this.parser.seedingTexSize[0],this.parser.seedingTexSize[1]);
            gl.bindTexture(gl.TEXTURE_2D,null);
            await this.FillTextureByImage(gl,seed_tex,gl.RGBA,gl.NEAREST,this.parser.seedingTexSize[0],this.parser.seedingTexSize[1],this.parser.seedingResourceArr[i],'UNSIGNED_BYTE');
            this.seedingTextureArr[i]=seed_tex;
            //能成功await到fill by image吗？
            }
        let trans_tex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D,trans_tex);
        gl.texStorage2D(gl.TEXTURE_2D,1,gl.RG32F,this.parser.projectionTexSize[0],this.parser.projectionTexSize[1]);
        gl.bindTexture(gl.TEXTURE_2D,null);
        await this.FillTextureByImage(gl,trans_tex,gl.RG,gl.LINEAR,this.parser.projectionTexSize[0],this.parser.projectionTexSize[1],this.parser.projection2DResource,'Float');
        this.transformTexture = trans_tex;

        this.particleMapBufferData = new Float32Array(this.parser.maxBlockSize*this.parser.maxBlockSize*3).fill(0);
        
        //vec3 (x,y,attribute)   in paper
        for (let i = 0; i < this.parser.maxTrajectoryNum; i++) {
            this.particleMapBufferData[i * 3 + 0] = rand(0, 1.0);
            this.particleMapBufferData[i * 3 + 1] = rand(0, 1.0);
            this.particleMapBufferData[i * 3 + 2] = 0.0;
        }

        //age in paper
        const particleCountdownData = new Float32Array(this.parser.maxTrajectoryNum);
        for (let i = 0; i < this.parser.maxTrajectoryNum; i++) {
            particleCountdownData[i] = this.parser.maxSegmentNum*9.0;
            //why 9.0?
        }

        //buffer for simulation
        this.simulationBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER,this.simulationBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,this.particleMapBufferData,gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER,null);
        this.xfSimulationBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER,this.xfSimulationBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,this.particleMapBufferData,gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER,null);
        this.lifeBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER,this.lifeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,particleCountdownData,gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER,null); 
        this.xfLifeBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER,this.xfLifeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,particleCountdownData,gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER,null);

    
        //vertex Array object
        this.simulationVAO = gl.createVertexArray()!;
        gl.bindVertexArray(this.simulationVAO);
        gl.bindBuffer(gl.ARRAY_BUFFER,this.simulationBuffer);
        gl.vertexAttribPointer(0,3,gl.FLOAT,false,3*4,0);
        gl.enableVertexAttribArray(0); // 第0个属性，每次读3个，滑动3*4 bits，从0开始
        gl.bindBuffer(gl.ARRAY_BUFFER,this.lifeBuffer);
        gl.vertexAttribPointer(1,1,gl.FLOAT,false,1*4,0);
        gl.enableVertexAttribArray(1);
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER,null);

        this.simulationVAO2 = gl.createVertexArray()!;
        gl.bindVertexArray(this.simulationVAO2);
        gl.bindBuffer(gl.ARRAY_BUFFER,this.xfSimulationBuffer);
        gl.vertexAttribPointer(0,3,gl.FLOAT,false,3*4,0);
        gl.enableVertexAttribArray(0);
        gl.bindBuffer(gl.ARRAY_BUFFER,this.xfLifeBuffer);
        gl.vertexAttribPointer(1,1,gl.FLOAT,false,1*4,0);
        gl.enableVertexAttribArray(1);
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER,null);

        this.renderVAO = gl.createVertexArray()!;
        gl.bindVertexArray(this.renderVAO);
        gl.bindBuffer(gl.ARRAY_BUFFER,this.lifeBuffer);
        gl.vertexAttribPointer(0,1,gl.FLOAT,false,1*4,0);
        gl.vertexAttribDivisor(0, 1);
        gl.enableVertexAttribArray(0);
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER,null);
        
        this.renderVAO2 = gl.createVertexArray()!;
        gl.bindVertexArray(this.renderVAO2);
        gl.bindBuffer(gl.ARRAY_BUFFER,this.xfLifeBuffer);
        gl.vertexAttribPointer(0,1,gl.FLOAT,false,1*4,0);
        gl.vertexAttribDivisor(0, 1);
        gl.enableVertexAttribArray(0);
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER,null);

        //transform feedback object-->  XFO or TFO 
        this.XFO = gl.createTransformFeedback()!;
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,this.XFO);
        gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,this.xfSimulationBuffer);
        gl.bindBufferRange(gl.TRANSFORM_FEEDBACK_BUFFER,0,this.xfSimulationBuffer,0,this.parser.maxBlockSize*this.parser.maxBlockSize*4*3);//vec3
        gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,this.xfLifeBuffer);
        gl.bindBufferRange(gl.TRANSFORM_FEEDBACK_BUFFER,1,this.xfLifeBuffer,0,this.parser.maxBlockSize*this.parser.maxBlockSize*4);//age
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);
        gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,null)

        this.XFO2 = gl.createTransformFeedback()!;
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,this.XFO2);
        gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,this.simulationBuffer);
        // 0 is a binding point 
        gl.bindBufferRange(gl.TRANSFORM_FEEDBACK_BUFFER,0,this.simulationBuffer,0,this.parser.maxBlockSize*this.parser.maxBlockSize*3*4);
        gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,this.lifeBuffer);
        // 1 is a binding point
        gl.bindBufferRange(gl.TRANSFORM_FEEDBACK_BUFFER,1,this.lifeBuffer,0,this.parser.maxBlockSize*this.parser.maxBlockSize*4);
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);
        gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,null);

        //maxBlockSize already set  , just for eazy understanding
        this.parser.maxBlockSize = Math.ceil(Math.sqrt(this.parser.maxTrajectoryNum));
        this.parser.maxBlockColumn = Math.floor(this.parser.maxTextureSize/this.parser.maxBlockSize);

        //build offser array
        for(let i = 0 ;i<this.parser.maxSegmentNum;i++){
            let offsetItem = {
                offsetX:this.parser.maxBlockSize*((i)%this.parser.maxBlockColumn),
                offsetY:this.parser.maxBlockSize*Math.floor((i)/this.parser.maxBlockColumn),
            }
            this.textureOffsetArray.push(offsetItem);
        }

        this.particleMapBufferData = new Float32Array(this.parser.maxBlockSize * this.parser.maxBlockSize * 3).fill(0);
        this.BO = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER,this.BO);
        gl.bufferData(gl.ARRAY_BUFFER,48,gl.DYNAMIC_DRAW);//size === 48bytes-- uniformblock里有12个float
        gl.bindBuffer(gl.ARRAY_BUFFER,null);

        //init the trajectory pool
        this.trajectoryPool = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D,this.trajectoryPool);
        gl.texStorage2D(gl.TEXTURE_2D,1,gl.RGB32F,this.parser.maxTextureSize,this.parser.maxTextureSize);
        gl.bindTexture(gl.TEXTURE_2D,null);

        //fill each block by particlebufferdata
        for (let i = 0;i<this.parser.maxSegmentNum;i++){
            this.FillBlockByData(
                gl,this.trajectoryPool,
                this.textureOffsetArray[i].offsetX,
                this.textureOffsetArray[i].offsetY,
                this.parser.maxBlockSize,
                this.parser.maxBlockSize,
                this.particleMapBufferData
            );
        }

        //init Shader and set TransformFeedbackVaryings
        let XF_Varings =  ['newInfo', 'aliveTime'];
        this.updateShaderObj = await this.init2ShadersFromSrc(
            gl,
            '/shaders/update.vert',
            '/shaders/update.frag',
            XF_Varings
        )
        this.trajectoryShaderObj = await this.init2ShadersFromSrc(
            gl,
            '/shaders/trajectory.noCulling.vert',
            '/shaders/trajectory.noCulling.frag',
        )
        this.pointShaderObj = await this.init2ShadersFromSrc(
            gl,
            '/shaders/point.noCulling.vert',
            '/shaders/point.noCulling.frag',
        )
        this.poolShaderObj = await this.init2ShadersFromSrc(
            gl,
            '/shaders/showPool.vert',
            '/shaders/showPool.frag',
        )
        
        gl.bindBuffer(gl.ARRAY_BUFFER,null);
        gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,null);
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);
        gl.bindTexture(gl.TEXTURE_2D,null);
        gl.bindVertexArray(null);

        this.uboMapBufferData[8] = this.parser.flowBoundary[0];
        this.uboMapBufferData[9] = this.parser.flowBoundary[1];
        this.uboMapBufferData[10] = this.parser.flowBoundary[2];
        this.uboMapBufferData[11] = this.parser.flowBoundary[3];

        this.isReady = true;
    }


    tickfunc(gl:WebGL2RenderingContext , matrix: number[]){
        this.beginBlock = (this.beginBlock+1)%this.parser.segmentNum;
        this.swap();
        
        if(this.ffManager.controller.isUnsteady){
            this.progressRate = this.timeCount/this.timeLast;
            // here  set the uboMapBufferData[0]
            this.timeCount = this.timeCount + 1;
        }
        
        this.uboMapBufferData[1] = this.ffManager.controller.segmentNum;
        this.uboMapBufferData[2] = this.ffManager.controller.fullLife;
        this.uboMapBufferData[3] = this.ffManager.controller.dropRate;
        this.uboMapBufferData[4] = this.ffManager.controller.dropRateBump;
        this.uboMapBufferData[5] = this.ffManager.controller.speedFactor;
        this.uboMapBufferData[6] = this.ffManager.controller.colorScheme;
        // [7] ?
        // 下面的部分放prepare
        // this.uboMapBufferData[8] = this.parser.flowBoundary[0];
        // this.uboMapBufferData[9] = this.parser.flowBoundary[1];
        // this.uboMapBufferData[10] = this.parser.flowBoundary[2];
        // this.uboMapBufferData[11] = this.parser.flowBoundary[3];

        //## simulation

        gl.bindBuffer(gl.UNIFORM_BUFFER,this.BO);
        gl.bufferData(gl.UNIFORM_BUFFER,this.uboMapBufferData,gl.DYNAMIC_DRAW);
        let bindingPoint = 0;
        gl.bindBufferRange(gl.UNIFORM_BUFFER,bindingPoint,this.BO,0,48);
        
        gl.bindVertexArray(this.now_sVAO);
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK ,this.now_XFO);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D,this.now_FFTextureArr[0]);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D,this.now_FFTextureArr[1]);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D,this.now_SeedTextureArr[0]);
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D,this.now_SeedTextureArr[1]);

        //-----updateShader start work
        gl.useProgram(this.updateShaderObj.program);
        let location:WebGLUniformLocation|null = null;
        location = gl.getUniformLocation(this.updateShaderObj.program,'flowField');
        gl.uniform1iv(location,[0,1]);
        location = gl.getUniformLocation(this.updateShaderObj.program,'mask');
        gl.uniform1iv(location,[2,3]);
        location = gl.getUniformLocation(this.updateShaderObj.program,'randomSeed');
        gl.uniform1f(location,Math.random());
        let blockIndex:number = 0;
        blockIndex = gl.getUniformBlockIndex(this.updateShaderObj.program,'FlowFieldUniforms');
        gl.uniformBlockBinding(this.updateShaderObj.program,blockIndex,bindingPoint);

        gl.enable(gl.RASTERIZER_DISCARD);
        gl.beginTransformFeedback(gl.POINTS);
        gl.drawArrays(gl.POINTS,0,this.parser.trajectoryNum);  //just one block
        gl.endTransformFeedback();
        gl.disable(gl.RASTERIZER_DISCARD);

        gl.bindVertexArray(null);
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);

        //-----update TrajectoryPool by the XFBO
        gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER,this.now_XFBO);

        // texSubImage2D  can  read from  unpack_BUFFER  no need to be parameter
        gl.bindTexture(gl.TEXTURE_2D,this.trajectoryPool);
        gl.texSubImage2D(gl.TEXTURE_2D,0,
            this.textureOffsetArray[this.beginBlock].offsetX,
            this.textureOffsetArray[this.beginBlock].offsetY,
            this.parser.maxBlockSize,
            this.parser.maxBlockSize,
            gl.RGB,
            gl.FLOAT,
            0)
        gl.bindTexture(gl.TEXTURE_2D,null);
        gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER,null);
        gl.finish();

        // ----wait for all block is updated
        if(this.parser.segmentPrepare > 0 ){
            this.parser.segmentPrepare--;
            return;
        }

        console.log('all block is updated ， start rendering');
        

        //## render
        gl.bindVertexArray(this.now_rVAO);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D,this.trajectoryPool);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D,this.transformTexture);

        // ------some rendering options
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendColor(0.0, 0.0, 0.0, 0.0);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        // ------primitive == 0  ---> flow
        // ------trajectoryShader working!
        gl.useProgram(this.trajectoryShaderObj.program);
        location = gl.getUniformLocation(this.trajectoryShaderObj.program,'particlePool');
        gl.uniform1i(location,0);
        location = gl.getUniformLocation(this.trajectoryShaderObj.program,'projectionTexture');
        gl.uniform1i(location,1);
        location = gl.getUniformLocation(this.trajectoryShaderObj.program,'blockNum');
        gl.uniform1i(location,this.parser.maxSegmentNum);
        location = gl.getUniformLocation(this.trajectoryShaderObj.program,'beginBlock');
        gl.uniform1i(location,this.beginBlock);
        location = gl.getUniformLocation(this.trajectoryShaderObj.program,'blockSize');
        gl.uniform1i(location,this.parser.maxBlockSize);
        location = gl.getUniformLocation(this.trajectoryShaderObj.program,'fillWidth');
        gl.uniform1f(location,this.ffManager.controller.fillWidth);
        location = gl.getUniformLocation(this.trajectoryShaderObj.program,'aaWidth');
        gl.uniform1f(location,this.ffManager.controller.aaWidth);
        location = gl.getUniformLocation(this.trajectoryShaderObj.program,'viewport');
        gl.uniform2f(location,gl.canvas.width,gl.canvas.height);
        location = gl.getUniformLocation(this.trajectoryShaderObj.program,'u_matrix');
        gl.uniformMatrix4fv(location, false, matrix);
        blockIndex = gl.getUniformBlockIndex(this.trajectoryShaderObj.program,'FlowFieldUniforms');
        gl.uniformBlockBinding(this.trajectoryShaderObj.program,blockIndex,bindingPoint);

        gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,(this.parser.segmentNum - 1)*2 , this.parser.trajectoryNum);

        gl.disable(gl.BLEND);
        gl.bindVertexArray(null);
        gl.bindTexture(gl.TEXTURE_2D,null);
    }


    async onAdd(map: mapboxgl.Map, gl: WebGL2RenderingContext){
        this.GL = gl;
        console.log('Custom flow field layer is being added...');
        
        this.map = map;
        await this.prepare(gl);

    }


    render(gl: WebGL2RenderingContext, matrix: number[]){
        if(!this.isReady){
            console.log('manager not ready');
            this.map?.triggerRepaint();
            return;
        }
        
        this.tickfunc(gl,matrix);
        this.map?.triggerRepaint();
            
    }
}