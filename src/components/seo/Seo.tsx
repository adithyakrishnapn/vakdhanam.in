import { useEffect } from 'react';

interface SeoProps {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: string;
}

export function Seo({ title, description, path = '/', image = '/favicon.svg', type = 'website' }: SeoProps) {
  useEffect(() => {
    const fullTitle = title.toLowerCase().includes('vakdhanam') ? title : `${title} | Vakdhanam.in`;
    document.title = fullTitle;

    const updateMeta = (selector: string, attribute: 'name' | 'property', value: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(`${selector}[${attribute}='${value}']`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, value);
        document.head.appendChild(element);
      }
      return element;
    };

    updateMeta('meta', 'name', 'description').setAttribute('content', description);
    updateMeta('meta', 'property', 'og:title').setAttribute('content', fullTitle);
    updateMeta('meta', 'property', 'og:description').setAttribute('content', description);
    updateMeta('meta', 'property', 'og:type').setAttribute('content', type);
    updateMeta('meta', 'property', 'og:image').setAttribute('content', image);
    updateMeta('meta', 'property', 'og:url').setAttribute('content', `https://vakdhanam.in${path}`);
    updateMeta('meta', 'property', 'twitter:card').setAttribute('content', 'summary_large_image');
    updateMeta('meta', 'property', 'twitter:title').setAttribute('content', fullTitle);
    updateMeta('meta', 'property', 'twitter:description').setAttribute('content', description);
    updateMeta('meta', 'property', 'twitter:image').setAttribute('content', image);

    const existingJsonLd = document.getElementById('vakdhanam-jsonld');
    if (existingJsonLd) {
      existingJsonLd.remove();
    }

    const script = document.createElement('script');
    script.id = 'vakdhanam-jsonld';
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Vakdhanam.in',
      description,
      url: `https://vakdhanam.in${path}`,
      inLanguage: 'en-IN',
    });
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [description, image, path, title, type]);

  return null;
}
