import {CustomLayerInterface} from 'mapbox-gl'
import {FlowFieldManager} from './FlowFieldManager';
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css';
import axios from 'axios'

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


    async getTexFromViewInforandSamplerInfoandResource(gl:WebGL2RenderingContext,viewInfo:any,samplerInfo:any,resource:any,type:string){
        let mipMapLevers = 1;
        let internalFormat = -1;
        let format = -1;
        let width = 0; 
        let height = 0;
        let _type = -1;

        if(type === 'flow_field'){
            width = this.parser.flowFieldTexSize[0];
            height = this.parser.flowFieldTexSize[1];
            if(viewInfo.format==='R32G32_SFLOAT'){
                internalFormat = gl.RG32F;
                format = gl.RG;
                _type = gl.FLOAT;
            }
                
        }
        else if(type === 'seeding'){
            width = this.parser.seedingTexSize[0];
            height = this.parser.seedingTexSize[1];
            if(viewInfo.format==='R8G8B8A8_UBYTE'){
                internalFormat = gl.RGBA8;
                format = gl.RGBA;
                _type = gl.UNSIGNED_BYTE;

            }
        }
        else if(type === 'transform'){
            width = this.parser.projectionTexSize[0];
            height = this.parser.projectionTexSize[1];
            if(viewInfo.format==='R32G32_SFLOAT'){
                internalFormat = gl.RG32F;
                format = gl.RG;
                _type = gl.FLOAT;

            }
        }
        else{
            console.log("ERROR::type");
            return;
        }
        if(internalFormat===-1){
            console.log("ERROR::internalFormat");
            return ;
        }

        const hereTexture = gl.createTexture()!;
        gl.bindTexture(viewInfo.target,hereTexture);
        gl.texStorage2D(viewInfo.target,mipMapLevers,internalFormat,width,height);
        gl.bindTexture(viewInfo.target,null);

        if(internalFormat === gl.RG32F){

            console.log('RG32F');
            const pixelData = await this.getBlobBufferData(resource);
            gl.bindTexture(viewInfo.target,hereTexture);
            gl.texSubImage2D(viewInfo.target,0,0,0,width,height,format,_type,new Float32Array(pixelData as any));
            gl.generateMipmap(viewInfo.target);

            gl.bindTexture(viewInfo.target,null);
            gl.finish();

            return hereTexture;

        }
        else if(internalFormat === gl.RGBA8){
            axios.get(resource,{responseType:'blob'})
            .then((response)=>{
                createImageBitmap(response.data,{imageOrientation:'flipY',premultiplyAlpha:'none',colorSpaceConversion:'default'})
                .then((bitmap)=>{
                    gl.bindTexture(viewInfo.target,hereTexture);
                    gl.texSubImage2D(viewInfo.target,0,0,0,width,height,format,_type,bitmap);

                    gl.generateMipmap(viewInfo.target);
                    gl.bindTexture(viewInfo.target,null);
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
        
        const RG32TextureViewInfo = {
            target:gl.TEXTURE_2D,
            flip:true,
            format:'R32G32_SFLOAT',
            viewType:gl.TEXTURE_2D,
        }

        const RGBA8TextureViewInfo = {
            target:gl.TEXTURE_2D,
            flip:true,
            format:'R8G8B8A8_UBYTE',
            viewType:gl.TEXTURE_2D,
        }

        const Near_SamplerInfo = {
            magFilter:gl.NEAREST,
            minFilter:gl.NEAREST,
            addressModeU:gl.CLAMP_TO_EDGE,
            addressModeV:gl.CLAMP_TO_EDGE,
        }

        const Linear_SamplerInfo = {
            magFilter:gl.LINEAR,
            minFilter:gl.LINEAR,
            addressModeU:gl.CLAMP_TO_EDGE,
            addressModeV:gl.CLAMP_TO_EDGE,
        }

        //parser as a JsonFileParser and a data storage

        this.parser = this.ffManager.parser;
        this.parser.segmentPrepare = this.ffManager.parser.maxSegmentNum;
        this.parser.maxBlockSize = Math.ceil(Math.sqrt(this.parser.maxTrajectoryNum));

        //uboMapBuffer
        this.uboMapBuffer[8] = this.parser.flowBoundary[0];
        this.uboMapBuffer[9] = this.parser.flowBoundary[1];
        this.uboMapBuffer[10] = this.parser.flowBoundary[2];
        this.uboMapBuffer[11] = this.parser.flowBoundary[3];
        
        this.phaseCount = this.parser.flowFieldResourceArr.length;
        this.timeLast = this.phaseCount * 150;

        this.textureArraySize = 3;
        // this.textureCollection = new Array(200).fill(null);
        // var textureCount = 0;

        for(var i=0;i<this.textureArraySize;i++){

            // a texture from RG32texviewInfo and Linear_SamplerInfo and RESOURCE
            this.flowFieldTextureArray[i] = await this.getTexFromViewInforandSamplerInfoandResource(gl,RG32TextureViewInfo,Linear_SamplerInfo,this.parser.flowFieldResourceArr[i],'flow_field');
            
            // a texture from RGBA8texviewInfo and Linear_SamplerInfo and RESOURCE
            this.seedingTextureArray[i] = await this.getTexFromViewInforandSamplerInfoandResource(gl,RGBA8TextureViewInfo,Near_SamplerInfo,this.parser.seedingResourceArr[i],'seeding');
        }
        this.transfromTexture = await this.getTexFromViewInforandSamplerInfoandResource(gl,RG32TextureViewInfo,Linear_SamplerInfo,this.parser.projection2DResource,'transform');


    }







    async onAdd(map: mapboxgl.Map, gl: WebGL2RenderingContext){
        console.log(this.ffManager);
        await this.prepare(gl);

        
    }

    render(gl: WebGL2RenderingContext, matrix: number[]){

    }




}