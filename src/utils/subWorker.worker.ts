
import { ParticleSystem } from "./ParticleSystem";

let isSuspended:boolean = false;
let gl:WebGL2RenderingContext;
let canvas:OffscreenCanvas;

function GL_getExtension(gl:WebGL2RenderingContext) {
    const Extensions = gl.getSupportedExtensions()!;
    for( let extension of Extensions){
        gl.getExtension(extension)
    }
    return gl;
}




const particleSys = new ParticleSystem();

onmessage = async (Message)=>{
    if(Message.data[0]==1){
        //subWorker start Parsing 
        await particleSys.ResourceParsing(Message.data[1]);
        postMessage([1]);
    }
    else if(Message.data[0]==2){
        //subWorker start Preparing
        canvas  = new OffscreenCanvas(0, 0);
        gl = GL_getExtension(canvas.getContext('webgl2') as WebGL2RenderingContext);
        
        particleSys.initTextureManeger(200,16,200,gl);

        await particleSys.prepare();

        postMessage([2]);
    }
    else if(Message.data[0]==3){
        //simulating

        // postMessage([3])
    }
    else if(Message.data[0]==4){
        isSuspended = true;
        // postMessage([4])
    }
    
}