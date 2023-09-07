import axios from "axios";
onmessage = async function(e){
    switch(e.data[0]){
        case 0:{
            let resource:string = e.data[1];
            await axios.get(resource,{responseType: 'blob'})
            .then((response)=>{
            createImageBitmap(response.data,{imageOrientation:'flipY',premultiplyAlpha:'none',colorSpaceConversion:'default'})
            //创建bitmap，省空间、便处理数据
            .then((imagebitmap)=>{
                // console.log("SUCCESS::GET BLOB RESPONSE & CREATE BITMAP FOR FLOAT TYPE");
                const bitmap = imagebitmap as ImageBitmap;
                const tempCanvas = new OffscreenCanvas(bitmap.width,bitmap.height);
                const tempGL = tempCanvas.getContext('webgl2')!;
                //pixelData读取bitmap数据，每个bitmap像素4字节，pixeldata[i]存储了像素的r 或g 或b 或a，顺序的
                const pixelData = new Uint8Array(bitmap.width*bitmap.height*4);
                
                const tempTex  = tempGL.createTexture();
                tempGL.bindTexture(tempGL.TEXTURE_2D, tempTex);
                //把bitmap数据填充到纹理
                tempGL.texImage2D(tempGL.TEXTURE_2D, 0, tempGL.RGBA8, bitmap.width , bitmap.height,0,tempGL.RGBA, tempGL.UNSIGNED_BYTE, bitmap);
                tempGL.texParameteri(tempGL.TEXTURE_2D, tempGL.TEXTURE_MAG_FILTER, tempGL.LINEAR);
                tempGL.texParameteri(tempGL.TEXTURE_2D, tempGL.TEXTURE_MIN_FILTER, tempGL.LINEAR);

                //创建帧缓冲
                const FBO = tempGL.createFramebuffer();
                tempGL.bindFramebuffer(tempGL.FRAMEBUFFER,FBO);
                //纹理attach到帧缓冲上
                tempGL.framebufferTexture2D(tempGL.FRAMEBUFFER,tempGL.COLOR_ATTACHMENT0,tempGL.TEXTURE_2D,tempTex,0);
                //从帧缓冲读取指定矩形的像素存到pixelData上  ， UNSIGNED_BYTE <--> UINT8  格式需对应
                tempGL.readPixels(0,0,bitmap.width,bitmap.height,tempGL.RGBA,tempGL.UNSIGNED_BYTE,pixelData);

                //清理战场
                tempGL.bindFramebuffer(tempGL.FRAMEBUFFER,null);
                tempGL.bindTexture(tempGL.TEXTURE_2D,null)
                tempGL.deleteFramebuffer(FBO);
                tempGL.deleteTexture(tempTex);
                tempGL.finish();
                // 返回pixeldata所用的二进制缓冲区
                
                this.postMessage(pixelData.buffer);
                }).catch(()=>{
                console.log('ERROR::getBlobBufferData::createImageBitmap');
                })
            }).catch(()=>{
                console.log('ERROR::getBlobBufferData::axios');
                this.postMessage(-1);
            })
            break;
        }
        case 1:{
            this.close();
            break;
        }
    }
}