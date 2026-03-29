'use client';

export default function PublicationSpread({ id, children }) {
  return (
    <section className="pub-spread" id={id}>
      {children}
    </section>
  );
}
