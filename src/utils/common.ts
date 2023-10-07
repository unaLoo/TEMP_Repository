
export const rand = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
}

export interface ShaderObj {
    VertexShader:WebGLShader,
    FragmentShader:WebGLShader,
    Program:WebGLProgram,
}