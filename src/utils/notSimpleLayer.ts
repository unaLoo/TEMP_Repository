import {CustomLayerInterface} from 'mapbox-gl'
import {FlowFieldManager} from './FlowFieldManager';
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css';
import axios from 'axios'
import {rand} from '@/utils/common'

export class notSimpleLayer implements CustomLayerInterface {
    id:string;
    type:any ;
    renderingMode:any;
    ffManager:FlowFieldManager;
    parser:any;

    uboMapBuffer:Float32Array = new Float32Array(12);
    phaseCount: any;
    timeLast: any;
    textureArraySize: number = 0;

    // textureCollection: any[] = new Array(200).fill(null);
    flowFieldTextureArray: any[] = new Array(3).fill(null);
    seedingTextureArray: any[] = new Array(3).fill(null);
    transfromTexture:any;

    // buffer
    particleMapBuffer: Float32Array = new Float32Array(0);

    simulationBuffer: WebGLBuffer = 0;
    xfSimulationBuffer: WebGLBuffer = 0;
    lifeBuffer: WebGLBuffer = 0;
    xfLifeBuffer: WebGLBuffer = 0;
    UBO: WebGLBuffer = 0;

    simulationVAO: WebGLVertexArrayObject = 0;
    simulationVAO2: WebGLVertexArrayObject = 0;
    sVAO:WebGLVertexArrayObject = 0;

    XFBO:WebGLTransformFeedback = 0;
    XFBO2:WebGLTransformFeedback = 0;
    xfBO:WebGLTransformFeedback = 0;

    //render
    renderVAO:WebGLVertexArrayObject=0;
    renderVAO2:WebGLVertexArrayObject=0;




    constructor(ffManager:FlowFieldManager) {
        this.id = 'FlowLayer';
        this.type = 'custom';
        this.renderingMode = '2d';
        this.ffManager = ffManager;
    }


    async getBlobBufferData(resource:any,){
        axios.get(resource,{responseType: 'blob'})
        .then((response)=>{
            createImageBitmap(response.data,{imageOrientation:'flipY',premultiplyAlpha:'none',colorSpaceConversion:'default'})
            .then((bitmap)=>{
                const tempCanvas = new OffscreenCanvas(bitmap.width,bitmap.height);
                const tempGL = tempCanvas.getContext('webgl2')!;
                const pixelData = new Uint8Array(bitmap.width*bitmap.height*4);
                
                const tempTex  = tempGL.createTexture();
                tempGL.bindTexture(tempGL.TEXTURE_2D, tempTex);
                tempGL.texImage2D(tempGL.TEXTURE_2D, 0, tempGL.RGBA8, bitmap.width , bitmap.height,0,tempGL.RGBA, tempGL.UNSIGNED_BYTE, bitmap);
                tempGL.texParameteri(tempGL.TEXTURE_2D, tempGL.TEXTURE_MAG_FILTER, tempGL.NEAREST);
                tempGL.texParameteri(tempGL.TEXTURE_2D, tempGL.TEXTURE_MIN_FILTER, tempGL.NEAREST);

                const FBO = tempGL.createFramebuffer();
                tempGL.bindFramebuffer(tempGL.TEXTURE_2D,FBO);
                tempGL.framebufferTexture2D(tempGL.FRAMEBUFFER,tempGL.COLOR_ATTACHMENT0,tempGL.TEXTURE_2D,tempTex,0);
                
                tempGL.readPixels(0,0,bitmap.width,bitmap.height,tempGL.RGBA,tempGL.UNSIGNED_BYTE,pixelData);

                tempGL.bindFramebuffer(tempGL.FRAMEBUFFER,null);
                tempGL.bindTexture(tempGL.TEXTURE_2D,null)
                tempGL.deleteFramebuffer(FBO);
                tempGL.deleteTexture(tempTex);
                tempGL.finish();

                return pixelData.buffer;
            }).catch(()=>{
                console.log('ERROR::getBlobBufferData::createImageBitmap');
                return;
            })
        }).catch(()=>{
            console.log('ERROR::getBlobBufferData::axios');
            return; 
        })
    }


    async getTexFromViewInfoandSamplerInfoandResource(gl:WebGL2RenderingContext,formatObj:any,filter:any,resource:string,type:string){
        let mipMapLevers = 1;
        let width = 0; 
        let height = 0;

        if(type === 'flow_field'){
            width = this.parser.flowFieldTexSize[0];
            height = this.parser.flowFieldTexSize[1];    
        }
        else if(type === 'seeding'){
            width = this.parser.seedingTexSize[0];
            height = this.parser.seedingTexSize[1];
        }
        else if(type === 'transform'){
            width = this.parser.projectionTexSize[0];
            height = this.parser.projectionTexSize[1];
        }
        else{
            console.log("ERROR::type");
            return;
        }


        const hereTexture = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D,hereTexture);
        gl.texStorage2D(gl.TEXTURE_2D,mipMapLevers,formatObj.internalFormat,width,height);
        gl.bindTexture(gl.TEXTURE_2D,null);

        if(formatObj._type === "FLOAT"){

            console.log('RG32F');
            const pixelData = await this.getBlobBufferData(resource);
            gl.bindTexture(gl.TEXTURE_2D,hereTexture);
            gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,width,height,formatObj.format,formatObj.type,new Float32Array(pixelData as any));
            gl.generateMipmap(gl.TEXTURE_2D);

            gl.bindTexture(gl.TEXTURE_2D,null);
            gl.finish();

            return hereTexture;

        }
        else if(formatObj._type === 'UNSIGNED_BYTE'){
            axios.get(resource,{responseType:'blob'})
            .then((response)=>{
                createImageBitmap(response.data,{imageOrientation:'flipY',premultiplyAlpha:'none',colorSpaceConversion:'default'})
                .then((bitmap)=>{
                    gl.bindTexture(gl.TEXTURE_2D,hereTexture);
                    gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,width,height,formatObj.format,formatObj.type,bitmap);

                    gl.generateMipmap(gl.TEXTURE_2D);
                    gl.bindTexture(gl.TEXTURE_2D,null);
                    gl.finish();
                    console.log('RGBA OKKKK');
                    
                    return hereTexture;
                })
            })
        }

        else {
            console.log('ERROR::internalFormat');
            return 'pass';
        }

    }
    
    fillTextureByIMG(){
        
    }

    async prepare(gl:WebGL2RenderingContext) {

        const RG32 = {
            internalFormat:gl.RG32F,
            format:gl.RG,
            type:gl.FLOAT,
            components:2,
            size:4,
            _type:'FLOAT',
        }
        const RGBA8 = {
            internalFormat:gl.RGBA8,
            format:gl.RGBA,
            type:gl.UNSIGNED_BYTE,
            components:4,
            size:1,
            _type:'UNSIGNED_BYTE'
        };

        const Filter_Near = gl.NEAREST;
        const Filter_Linear = gl.LINEAR;

        //parser as a JsonFileParser and a data storage
        //just for short writing
        this.parser = this.ffManager.parser;
        // maxSegmentNum === segmentNum === segmentPrepare
        this.parser.segmentPrepare = this.ffManager.parser.maxSegmentNum;
        this.parser.segmentNum = this.ffManager.parser.maxSegmentNum;
        this.parser.maxBlockSize = Math.ceil(Math.sqrt(this.parser.maxTrajectoryNum));

        //uboMapBuffer   why?
        this.uboMapBuffer[8] = this.parser.flowBoundary[0];
        this.uboMapBuffer[9] = this.parser.flowBoundary[1];
        this.uboMapBuffer[10] = this.parser.flowBoundary[2];
        this.uboMapBuffer[11] = this.parser.flowBoundary[3];
        
        // why?
        this.phaseCount = this.parser.flowFieldResourceArr.length;
        this.timeLast = this.phaseCount * 150;

        // why 3?
        this.textureArraySize = 3;

        for(var i=0;i<this.textureArraySize;i++){

            // a texture from RG32texviewInfo and Linear_SamplerInfo and RESOURCE
            this.flowFieldTextureArray[i] = await this.getTexFromViewInfoandSamplerInfoandResource(gl,RG32,Filter_Linear,this.parser.flowFieldResourceArr[i],'flow_field');
            
            // a texture from RGBA8texviewInfo and Linear_SamplerInfo and RESOURCE
            this.seedingTextureArray[i] = await this.getTexFromViewInfoandSamplerInfoandResource(gl,RGBA8,Filter_Near,this.parser.seedingResourceArr[i],'seeding');
        }
        this.transfromTexture = await this.getTexFromViewInfoandSamplerInfoandResource(gl,RG32,Filter_Linear,this.parser.projection2DResource,'transform');

        this.particleMapBuffer = new Float32Array(this.parser.maxBlockSize*this.parser.maxBlockSize*3).fill(0);
        // size === 4*4*3 
        for (let i = 0; i < this.parser.maxBlockSize; i++) {
            this.particleMapBuffer[i * 3 + 0] = rand(0, 1.0);
            this.particleMapBuffer[i * 3 + 1] = rand(0, 1.0);
            this.particleMapBuffer[i * 3 + 2] = 0.0;
        }


        const particleCountdownArray = new Float32Array(this.parser.maxTrajectoryNum);
        for (let i = 0; i < this.parser.maxTrajectoryNum; i++) {
            particleCountdownArray[i] = this.parser.maxTrajectoryNum*9.0;
            //size is 9   each element is 16*9 ?
        }

        //buffer for simulation
        this.simulationBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER,this.simulationBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,this.particleMapBuffer,gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER,null);
        this.xfSimulationBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER,this.xfSimulationBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,this.particleMapBuffer,gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER,null);
        this.lifeBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER,this.lifeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,particleCountdownArray,gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER,null); 
        this.xfLifeBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER,this.xfLifeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,particleCountdownArray,gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER,null);

        //Uniform buffer object
        this.UBO = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER,this.UBO);
        gl.bufferData(gl.ARRAY_BUFFER,48,gl.DYNAMIC_DRAW);
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
        gl.enableVertexAttribArray(0);
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER,null);
        
        this.renderVAO2 = gl.createVertexArray()!;
        gl.bindVertexArray(this.renderVAO2);
        gl.bindBuffer(gl.ARRAY_BUFFER,this.xfLifeBuffer);
        gl.vertexAttribPointer(0,1,gl.FLOAT,false,1*4,0);
        gl.enableVertexAttribArray(0);
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER,null);

        this.XFBO = gl.createTransformFeedback()!;
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,this.XFBO);
        gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,this.xfSimulationBuffer);
        gl.bindBufferRange(gl.TRANSFORM_FEEDBACK_BUFFER,0,this.xfSimulationBuffer,0,this.parser.maxBlockSize*this.parser.maxBlockSize*3*4);
        gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,this.xfLifeBuffer);
        gl.bindBufferRange(gl.TRANSFORM_FEEDBACK_BUFFER,1,this.xfLifeBuffer,0,this.parser.maxBlockSize*this.parser.maxBlockSize*4);
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);
        gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,null)

        this.XFBO2 = gl.createTransformFeedback()!;
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,this.XFBO2);
        gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,this.simulationBuffer);
        gl.bindBufferRange(gl.TRANSFORM_FEEDBACK_BUFFER,0,this.simulationBuffer,0,this.parser.maxBlockSize*this.parser.maxBlockSize*3*4);
        gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,this.lifeBuffer);
        gl.bindBufferRange(gl.TRANSFORM_FEEDBACK_BUFFER,1,this.lifeBuffer,0,this.parser.maxBlockSize*this.parser.maxBlockSize*4);
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);
        gl.bindBuffer(gl.TRANSFORM_DBACK_BUFFER,null)
        gl.bindBuffer(gl.TRANSFORM_DBACK_BUFFER,null)
        gl.bindBuffer(gl.TRANSFORM_v11locfuBACK_BUFFER,null)

        
        
        


 


        


    }







    async onAdd(map: mapboxgl.Map, gl: WebGL2RenderingContext){
        console.log(this.ffManager);
        await this.prepare(gl);

        
    }

    render(gl: WebGL2RenderingContext, matrix: number[]){

    }

    




}