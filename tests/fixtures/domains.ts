import type { Domain } from '../../src/types.js';

export function makeDomain(name: string, sld?: string, tld?: string): Domain {
  const parts = name.split('.');
  return {
    name,
    sld: sld ?? parts[0] ?? name,
    tld: tld ?? parts.slice(1).join('.'),
  };
}

export const DOMAIN_COM = makeDomain('example.com', 'example', 'com');
export const DOMAIN_IO = makeDomain('myapp.io', 'myapp', 'io');
export const DOMAIN_AI = makeDomain('smart.ai', 'smart', 'ai');
export const DOMAIN_CO_UK = makeDomain('shop.co.uk', 'shop', 'co.uk');
export const DOMAIN_SHORT = makeDomain('go.co', 'go', 'co');
export const DOMAIN_LONG = makeDomain('averylongdomainname.com', 'averylongdomainname', 'com');
export const DOMAIN_HYPHEN = makeDomain('my-domain.com', 'my-domain', 'com');
export const DOMAIN_NUMBER = makeDomain('shop123.com', 'shop123', 'com');
