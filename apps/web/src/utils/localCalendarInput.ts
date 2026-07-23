function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toLocalDateInput(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function toLocalMonthInput(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}`;
}
