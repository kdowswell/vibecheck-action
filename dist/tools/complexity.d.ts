import { z } from 'zod';
export declare const complexityParams: z.ZodObject<{
    code: z.ZodString;
    filename: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    code: string;
    filename?: string | undefined;
}, {
    code: string;
    filename?: string | undefined;
}>;
export type ComplexityParams = z.infer<typeof complexityParams>;
export declare function complexityHandler(params: ComplexityParams): Promise<string>;
//# sourceMappingURL=complexity.d.ts.map