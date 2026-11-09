import assert from 'node:assert/strict';
import { canonicalHrefForPath, withCanonical, wwwRedirectTarget } from '../src/shopCanonical';

assert.equal(wwwRedirectTarget('https://www.racketpoint.bg/'), 'https://racketpoint.bg/');
assert.equal(wwwRedirectTarget('https://www.racketpoint.bg'), 'https://racketpoint.bg/');
assert.equal(wwwRedirectTarget('http://www.racketpoint.bg/'), 'https://racketpoint.bg/');
assert.equal(
	wwwRedirectTarget('https://www.racketpoint.bg/contact?utm_source=ads'),
	'https://racketpoint.bg/contact?utm_source=ads',
);
assert.equal(wwwRedirectTarget('https://www.racketpoint.bg/return-policy/'), 'https://racketpoint.bg/return-policy/');
assert.equal(wwwRedirectTarget('https://racketpoint.bg/'), null);
assert.equal(wwwRedirectTarget('https://racketpoint.bg/contact'), null);
assert.equal(wwwRedirectTarget('https://notwww.racketpoint.bg/'), null);

assert.equal(canonicalHrefForPath('/'), 'https://racketpoint.bg/');
assert.equal(canonicalHrefForPath('/contact'), null);
assert.equal(canonicalHrefForPath('/contact/'), null);
assert.equal(canonicalHrefForPath('/return-policy'), null);
assert.equal(canonicalHrefForPath('/index.html'), null);

const shell = '<head><title>Racketpoint.bg</title></head><body></body>';
const tagged = withCanonical(shell, 'https://racketpoint.bg/');
assert.equal(tagged.includes('<link rel="canonical" href="https://racketpoint.bg/" />'), true);
assert.equal(withCanonical(tagged, 'https://racketpoint.bg/return-policy'), tagged);

console.log('shop canonical checks passed');
