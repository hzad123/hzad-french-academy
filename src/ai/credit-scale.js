let scale=1;
export function setCreditScale(value){if(![1,100].includes(value))throw Error('Unknown credit pricing');scale=value}
export const creditScale=()=>scale;
export function formatCredits(value){return Number.isSafeInteger(value)?(value/scale).toLocaleString('en-US',{maximumFractionDigits:2}):'—'}
export function creditLabel(value){return formatCredits(value)+' '+(value===scale?'credit':'credits')}
export function notifyCreditsChanged(){globalThis.dispatchEvent?.(new Event('hzad-credit-changed'))}
