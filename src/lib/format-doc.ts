// Máscara e validação de CPF/CNPJ (com dígito verificador).
// Espelha o padrão de src/lib/format-phone.ts.

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

// Máscara dinâmica: 000.000.000-00 (CPF) ou 00.000.000/0000-00 (CNPJ)
export function formatCpfCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14);

  if (d.length <= 11) {
    // CPF
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }

  // CNPJ
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos iguais

  const calcDigit = (len: number): number => {
    let sum = 0;
    for (let i = 0; i < len; i++) {
      sum += parseInt(cpf[i], 10) * (len + 1 - i);
    }
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  return calcDigit(9) === parseInt(cpf[9], 10) && calcDigit(10) === parseInt(cpf[10], 10);
}

export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calcDigit = (len: number): number => {
    const weights =
      len === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) {
      sum += parseInt(cnpj[i], 10) * weights[i];
    }
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  return (
    calcDigit(12) === parseInt(cnpj[12], 10) &&
    calcDigit(13) === parseInt(cnpj[13], 10)
  );
}

// Vazio é válido (campo opcional). Se preenchido, precisa ser CPF ou CNPJ válido.
export function validateCpfCnpj(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length === 0) return true;
  if (d.length === 11) return isValidCpf(d);
  if (d.length === 14) return isValidCnpj(d);
  return false;
}
