
export const rand = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
}