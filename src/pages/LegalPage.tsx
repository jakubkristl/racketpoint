import { Link, Navigate, useLocation } from 'react-router-dom';
import { getLegalDocument, legalCompany, legalDocuments } from '../data/legalDocs';

function LegalPage() {
  const location = useLocation();
  const slug = location.pathname.replace(/^\//, '');
  const document = getLegalDocument(slug);

  if (!document) {
    return <Navigate replace to="/terms" />;
  }

  return (
    <div className="page-shell">
      <main className="legal-page">
        <p className="eyebrow">{document.eyebrow}</p>
        <h1>{document.title}</h1>
        <p className="intro">{document.intro}</p>
        <p className="legal-updated">Последна актуализация: {document.updatedOn}</p>

        <nav className="legal-doc-nav" aria-label="Правни документи">
          {legalDocuments.map((item) => (
            <Link
              key={item.slug}
              className={item.slug === document.slug ? 'legal-doc-link active' : 'legal-doc-link'}
              to={`/${item.slug}`}
            >
              {item.title}
            </Link>
          ))}
        </nav>

        {document.sections.map((section) => (
          <section key={section.heading} className="legal-section">
            <h2>{section.heading}</h2>
            {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.bullets ? (
              <ul>
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
            {section.after?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>
        ))}

        <p className="legal-contact-line">
          Въпроси: <a href={`mailto:${legalCompany.email}`}>{legalCompany.email}</a>
          {' · '}
          <a href={`mailto:${legalCompany.inboxEmail}`}>{legalCompany.inboxEmail}</a>
          {' · '}
          <Link to="/contact">Контакт</Link>
        </p>
      </main>
    </div>
  );
}

export default LegalPage;
