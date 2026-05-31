// Raw WHOIS response strings for various scenarios

export const WHOIS_AVAILABLE_VERISIGN = `
No match for "NOTREGISTERED.COM".
>>> Last update of whois database: 2024-01-01T00:00:00Z <<<
`;

export const WHOIS_AVAILABLE_NOT_FOUND = `
NOT FOUND
`;

export const WHOIS_AVAILABLE_NO_ENTRIES = `
% No entries found for the selected source(s).
`;

export const WHOIS_AVAILABLE_FREE_STATUS = `
Domain Status: Free
`;

export const WHOIS_TAKEN_VERISIGN = `
Domain Name: EXAMPLE.COM
Registry Domain ID: 2336799_DOMAIN_COM-VRSN
Registrar WHOIS Server: whois.iana.org
Registrar URL: http://res-dom.iana.org
Updated Date: 2023-08-14T07:01:31Z
Creation Date: 1992-01-01T05:00:00Z
Registry Expiry Date: 2024-01-01T05:00:00Z
Registrar: RESERVED-Internet Assigned Numbers Authority
Registrar IANA ID: 376
Registrar Abuse Contact Email: abuse@iana.org
Registrar Abuse Contact Phone: +1.3108239358
Domain Status: clientDeleteProhibited
Domain Status: clientTransferProhibited
Domain Status: clientUpdateProhibited
Name Server: A.IANA-SERVERS.NET
Name Server: B.IANA-SERVERS.NET
Registrant Organization: Internet Assigned Numbers Authority
Registrant Email: domainabuse@iana.org
`;

export const WHOIS_TAKEN_DENIC = `
% Restricted rights.
%
% Terms and Conditions of Use
%
% The above data may only be used within the scope of technical or
% administrative necessities of Internet operation or to remedy legal
% problems.

domain:             example.de
nserver:            ns1.example.de
nserver:            ns2.example.de
status:             connect
changed:            2020-01-01T00:00:00+01:00
source:             DENIC-ZZ

[organisation]
Organisation:       Example GmbH
changed:            2020-01-01T00:00:00+01:00
`;

export const WHOIS_TAKEN_MINIMAL = `
Domain Name: test.org
Registrar: Test Registrar Inc.
Creation Date: 2015-06-15
Registry Expiry Date: 2026-06-15
Name Server: ns1.test.org
Name Server: ns2.test.org
`;

export const WHOIS_TAKEN_GDPR_REDACTED = `
Domain Name: PRIVATE.COM
Registrar: Privacy Registrar LLC
Creation Date: 2019-03-01T00:00:00Z
Registry Expiry Date: 2025-03-01T00:00:00Z
Registrant Organization: REDACTED FOR PRIVACY
Registrant Email: Please query the RDDS service of the Registrar of Record
Name Server: ns1.example.com
Domain Status: clientTransferProhibited
`;

export const WHOIS_EMPTY = '';
