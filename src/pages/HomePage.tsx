function HomePage() {

  return (
    <div style={{ padding: '80px 20px', textAlign: 'center', minHeight: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4efe6' }}>
      <h1 style={{ fontSize: '2.8rem', marginBottom: '16px', fontWeight: 700, color: '#111', lineHeight: 1.2 }}>
        Coming Soon
      </h1>
      <p style={{ fontSize: '1.2rem', color: '#5f5a52', marginBottom: '12px', maxWidth: '500px' }}>
        Racketpoint.bg is under active development
      </p>
      <p style={{ fontSize: '1.2rem', color: '#5f5a52', fontWeight: 600 }}>
        Expected launch: <span style={{ color: '#0b6b57' }}>August 10, 2026</span>
      </p>
    </div>
  );
}

export default HomePage;
