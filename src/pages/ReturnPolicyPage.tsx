import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { legalCompany, legalDocumentPath, legalDocuments } from '../data/legalDocs';
import { returnPolicyBg, returnPolicyCopies, returnPolicyEn, returnPolicyUrl, type PolicyCopy } from '../data/returnPolicy';

function PolicyArticle({ copy, headingLevel }: { copy: PolicyCopy; headingLevel: 'h1' | 'h2' }) {
  const Heading = headingLevel;

  return (
    <article id={copy.id} lang={copy.lang} className="legal-lang">
      <p className="eyebrow">{copy.eyebrow}</p>
      <Heading>{copy.title}</Heading>
      <p className="intro">{copy.intro}</p>
      <p className="legal-updated">{copy.updatedLabel}: {copy.updatedOn}</p>
      <p className="legal-updated">
        <a href={returnPolicyUrl}>{returnPolicyUrl}</a>
      </p>
      {copy.sections.map((section) => (
        <section key={section.heading} className="legal-section">
          <h2>{section.heading}</h2>
          {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {section.bullets ? (
            <ul>
              {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
            </ul>
          ) : null}
        </section>
      ))}
    </article>
  );
}

function ReturnPolicyPage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${returnPolicyBg.title} | ${legalCompany.shopName}`;
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="page-shell">
      <main className="legal-page">
        <nav className="legal-doc-nav" aria-label="Правни документи">
          {legalDocuments.map((item) => (
            <Link
              key={item.slug}
              className={item.slug === 'returns' ? 'legal-doc-link active' : 'legal-doc-link'}
              to={legalDocumentPath(item.slug)}
            >
              {item.title}
            </Link>
          ))}
          <a className="legal-doc-link" href={`#${returnPolicyEn.id}`}>English</a>
        </nav>

        {returnPolicyCopies.map((copy) => (
          <PolicyArticle key={copy.id} copy={copy} headingLevel={copy.lang === 'bg' ? 'h1' : 'h2'} />
        ))}

        <p className="legal-contact-line">
          Въпроси: <a href={`mailto:${legalCompany.email}`}>{legalCompany.email}</a>
          {' · '}
          <a href={`mailto:${legalCompany.inboxEmail}`}>{legalCompany.inboxEmail}</a>
          {' · '}
          <a href={`tel:${legalCompany.phone.replace(/\s+/g, '')}`}>{legalCompany.phone}</a>
          {' · '}
          <Link to="/contact">Контакт</Link>
        </p>
      </main>
    </div>
  );
}

export default ReturnPolicyPage;
