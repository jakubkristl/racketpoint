import { legalCompany } from './legalDocs';

export type PolicySection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type PolicyCopy = {
  id: string;
  lang: 'bg' | 'en';
  eyebrow: string;
  title: string;
  intro: string;
  updatedLabel: string;
  updatedOn: string;
  sections: PolicySection[];
};

export const returnPolicyPath = '/return-policy';
export const returnPolicyUrl = `${legalCompany.site}${returnPolicyPath}`;

const shopAddress = [
  legalCompany.name,
  legalCompany.address,
  legalCompany.email,
  legalCompany.inboxEmail,
  legalCompany.phone,
];

export const returnPolicyBg: PolicyCopy = {
  id: 'return-policy-bg',
  lang: 'bg',
  eyebrow: 'Връщане и отказ',
  title: 'Политика за връщане',
  intro: `Тази политика важи за покупки от онлайн магазина ${legalCompany.shopName} на ${legalCompany.name} в България. Приемаме връщане на дефектни и на недефектни стоки.`,
  updatedLabel: 'Последна актуализация',
  updatedOn: '25 октомври 2026',
  sections: [
    {
      heading: 'Срок за отказ',
      paragraphs: [
        'Имате 14 дни от доставката, за да се откажете от покупката, без да посочвате причина.',
        'След като ни уведомите за отказа, имате още 14 дни, за да изпратите стоката обратно.',
      ],
    },
    {
      heading: 'Кой плаща обратната доставка',
      bullets: [
        'Недефектна стока: клиентът плаща обратната доставка.',
        'Дефектна стока или грешен артикул: магазинът плаща обратната доставка и възстановява сумата или заменя стоката.',
      ],
    },
    {
      heading: 'Възстановяване',
      paragraphs: [
        'Възстановяваме сумата по първоначалния начин на плащане в срок до 14 дни от получаването на върнатата стока.',
      ],
    },
    {
      heading: 'Изключения',
      paragraphs: [
        'Единствените изключения са:',
      ],
      bullets: [
        'стоки, изработени по индивидуална поръчка;',
        'запечатани хигиенни стоки, след като са разпечатани.',
      ],
    },
    {
      heading: 'Как да започнете връщане',
      paragraphs: [
        `Пишете на ${legalCompany.email} или ${legalCompany.inboxEmail}, или се обадете на ${legalCompany.phone} (${legalCompany.hours}). Посочете номера на поръчката и кои артикули връщате. Изпратете стоката на адреса на магазина:`,
      ],
      bullets: [
        `${legalCompany.name}, Булстат ${legalCompany.bulstat}`,
        ...shopAddress.slice(1),
      ],
    },
  ],
};

export const returnPolicyEn: PolicyCopy = {
  id: 'return-policy-en',
  lang: 'en',
  eyebrow: 'Returns and withdrawal',
  title: 'Return policy',
  intro: `This policy applies to purchases from the online shop ${legalCompany.shopName}, operated by ${legalCompany.name} in Bulgaria. We accept returns of defective and non-defective products.`,
  updatedLabel: 'Last updated',
  updatedOn: '25 October 2026',
  sections: [
    {
      heading: 'Withdrawal period',
      paragraphs: [
        'You have 14 days from delivery to withdraw from the purchase. You do not have to give a reason.',
        'After you tell us, you have another 14 days to send the goods back.',
      ],
    },
    {
      heading: 'Who pays for return shipping',
      bullets: [
        'Non-defective products: the customer pays the return shipping.',
        'Defective products or the wrong item: the shop pays the return shipping and refunds or replaces the product.',
      ],
    },
    {
      heading: 'Refund',
      paragraphs: [
        'We refund the original payment method within 14 days of receiving the returned goods.',
      ],
    },
    {
      heading: 'Exceptions',
      paragraphs: [
        'The only exceptions are:',
      ],
      bullets: [
        'custom-made goods;',
        'sealed hygiene items once unsealed.',
      ],
    },
    {
      heading: 'How to start a return',
      paragraphs: [
        `Email ${legalCompany.email} or ${legalCompany.inboxEmail}, or call ${legalCompany.phone} (Monday–Friday, 09:00–18:00). Include the order number and the items you are returning. Send the goods to the shop address:`,
      ],
      bullets: [
        `${legalCompany.name}, Bulstat ${legalCompany.bulstat}`,
        ...shopAddress.slice(1),
      ],
    },
  ],
};

export const returnPolicyCopies = [returnPolicyBg, returnPolicyEn];

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderCopy(copy: PolicyCopy) {
  const sections = copy.sections.map((section) => {
    const paragraphs = (section.paragraphs ?? []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('');
    const bullets = section.bullets?.length
      ? `<ul>${section.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul>`
      : '';
    return `<section><h2>${escapeHtml(section.heading)}</h2>${paragraphs}${bullets}</section>`;
  }).join('');

  return `<article id="${copy.id}" lang="${copy.lang}"><p>${escapeHtml(copy.eyebrow)}</p><h1>${escapeHtml(copy.title)}</h1><p>${escapeHtml(copy.intro)}</p><p>${escapeHtml(`${copy.updatedLabel}: ${copy.updatedOn}`)}</p><p>${escapeHtml(returnPolicyUrl)}</p>${sections}</article>`;
}

export function renderReturnPolicyFallbackHtml() {
  return `<noscript id="return-policy-noscript">${returnPolicyCopies.map((copy) => renderCopy(copy)).join('')}</noscript>`;
}
