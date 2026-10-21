import { check } from "zod";

export function onlyDigits(value: string): string {
    return value.replace(/\D/g, "");
}

export function normalizeCnpj(value: string): string {
    return value.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

export function isValidCpf(input: string): boolean {
    const cpf = onlyDigits(input);
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    const digits = cpf.split("").map(Number);

    const checkDigit = (length: number): number => {
        let sum = 0;
        for (let i = 0; i < length; i++) {
            sum += digits[i]! * (length + 1 - i);
        }
        const rest = (sum * 10) % 11;
        return rest === 10 ? 0 : rest;
    };

    return checkDigit(9) === digits[9] && checkDigit(10) === digits[10];
}

const CNPJ_WEIGHTS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_WEIGHTS_2 = [6, ...CNPJ_WEIGHTS_1];

export function isValidCnpj(input: string): boolean {
    const cnpj = normalizeCnpj(input);
    if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(cnpj)) return false;
    if (/^(.)\1{13}$/.test(cnpj)) return false;

    const values = cnpj.split("").map((c) => c.charCodeAt(0) - 48);

    const checkDigit = (weights: number[]): number => {
        let sum = 0;
        weights.forEach((weight, i) => {
            sum += values[i]! * weight;
        });
        const rest = sum % 11;
        return rest < 2 ? 0 : 11 - rest;
    };
    
    return (
        checkDigit(CNPJ_WEIGHTS_1) === values[12] &&
        checkDigit(CNPJ_WEIGHTS_2) === values[13]
    );
}

export function maskCpf(input: string): string {
    const cpf = onlyDigits(input);
    return cpf.length === 11 ? `***.***.***-${cpf.slice(9)}` : "***";
}