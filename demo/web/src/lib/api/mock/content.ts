import type { NewsDetail, Page, SiteInfo } from "../types";

/** Contenido de demo con el formato del CMS del contrato (GET /site, /pages, /news). */

const img = (seed: string, w = 1600, h = 1000) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const mockSite: SiteInfo = {
  name: "Nexo Institucional",
  slogan: "Conectamos instituciones con soluciones",
  description: "Proveemos productos y bienes para instituciones públicas y privadas de Bolivia.",
  contact: {
    address: "Av. 16 de Julio (El Prado) 1234, La Paz, Bolivia",
    phone: "+591 2 2000000",
    whatsapp: "+591 70000000",
    email: "contacto@nexo.com.bo",
    hours: "Lunes a viernes, 08:30 a 18:30",
  },
  social: [
    { network: "facebook", url: "https://facebook.com/" },
    { network: "instagram", url: "https://instagram.com/" },
    { network: "linkedin", url: "https://linkedin.com/" },
  ],
  nav: [
    { label: "Inicio", href: "/" },
    { label: "Nosotros", href: "/nosotros" },
    { label: "Servicios", href: "/servicios" },
    { label: "Catálogo", href: "/catalogo" },
    { label: "Noticias", href: "/noticias" },
    { label: "Contacto", href: "/contacto" },
  ],
};

const UPDATED = "2026-10-15T12:00:00Z";

export const mockPages: Page[] = [
  {
    slug: "inicio",
    title: "Inicio",
    seo: {
      title: "Nexo Institucional · Conectamos instituciones con soluciones",
      description:
        "Equipamiento, mobiliario, flota y servicios para instituciones públicas y privadas de Bolivia, con precios en bolivianos y soporte local.",
      ogImageUrl: null,
    },
    updatedAt: UPDATED,
    blocks: [
      {
        id: "inicio-hero",
        type: "hero",
        data: {
          eyebrow: "Proveedor institucional · Bolivia",
          title: "Conectamos instituciones con soluciones",
          subtitle:
            "Equipamiento, mobiliario, flota y servicios para organismos públicos y empresas, con precios claros en bolivianos y soporte en todo el país.",
          primaryCta: { label: "Explorar catálogo", href: "/catalogo" },
          secondaryCta: { label: "Solicitar cotización", href: "/contacto" },
          image: { url: img("nexo-hero", 1800, 1200), alt: "Equipo de Nexo coordinando una entrega institucional" },
        },
      },
      {
        id: "inicio-about",
        type: "richText",
        data: {
          title: "Quiénes somos",
          html: "<p>Nexo nació para que comprar para una institución sea <strong>simple, transparente y rápido.</strong> Conectamos organismos públicos y empresas de los nueve departamentos con productos que funcionan y personas que responden.</p>",
        },
      },
      {
        id: "inicio-features",
        type: "features",
        data: {
          title: "Todo lo que una institución necesita, en un solo nexo",
          subtitle: "Un equipo, un contrato y un responsable por cada etapa: desde la cotización hasta el soporte postventa.",
          items: [
            {
              icon: "package-check",
              title: "Provisión integral",
              text: "Tecnología, mobiliario, herramientas y flota de marcas con respaldo local y stock en Bolivia.",
              href: "/servicios",
            },
            {
              icon: "file-check",
              title: "Compras públicas",
              text: "Acompañamos licitaciones y concursos con documentación completa y fichas técnicas claras.",
              href: "/servicios",
            },
            {
              icon: "truck",
              title: "Logística nacional",
              text: "Entregamos en los 9 departamentos con seguimiento y actas de recepción firmadas.",
              href: "/servicios",
            },
            {
              icon: "shield-check",
              title: "Garantía y soporte",
              text: "Mesa de ayuda propia, repuestos y técnicos certificados en La Paz, Santa Cruz y Cochabamba.",
              href: "/servicios",
            },
          ],
        },
      },
      {
        id: "inicio-stats",
        type: "stats",
        data: {
          title: "Números que nos respaldan",
          items: [
            { value: 18, prefix: null, suffix: " años", label: "de trayectoria en el país" },
            { value: 1200, prefix: "+", suffix: null, label: "instituciones atendidas" },
            { value: 9, prefix: null, suffix: null, label: "departamentos con cobertura" },
            { value: 98, prefix: null, suffix: "%", label: "de entregas a tiempo" },
          ],
        },
      },
      {
        id: "inicio-cta",
        type: "cta",
        data: {
          title: "¿Tiene una compra o licitación en puerta?",
          text: "Cuéntenos qué necesita y le enviamos una propuesta con precios en bolivianos en menos de 48 horas hábiles.",
          button: { label: "Hablar con un asesor", href: "/contacto" },
        },
      },
    ],
  },
  {
    slug: "nosotros",
    title: "Nosotros",
    seo: {
      title: "Nosotros",
      description: "Conozca la historia, el equipo y los valores de Nexo Institucional, proveedor de instituciones en Bolivia desde 2008.",
      ogImageUrl: null,
    },
    updatedAt: UPDATED,
    blocks: [
      {
        id: "nos-hero",
        type: "hero",
        data: {
          eyebrow: "Nosotros",
          title: "Una red construida sobre la confianza",
          subtitle:
            "Desde 2008 conectamos a instituciones bolivianas con productos y servicios que funcionan, con trato cercano y reglas claras.",
          primaryCta: null,
          secondaryCta: null,
          image: { url: img("nexo-equipo", 1800, 1100), alt: "Equipo de Nexo Institucional en la oficina de La Paz" },
        },
      },
      {
        id: "nos-historia",
        type: "richText",
        data: {
          title: "Nuestra historia",
          html: "<p>Nexo nació en La Paz con una idea simple: que comprar para una institución no tenga que ser complicado. Empezamos proveyendo equipos de red a municipalidades y hoy acompañamos a ministerios, gobernaciones, cooperativas y empresas privadas en todo el país.</p><p>Trabajamos con <strong>procesos transparentes</strong>, precios en bolivianos y documentación completa para cada compra. Creemos que la <em>tecnología correcta, en el lugar correcto</em>, mejora la atención a las personas.</p><blockquote>“Nuestro trabajo termina cuando el equipo está funcionando, no cuando se emite la factura.”</blockquote>",
        },
      },
      {
        id: "nos-timeline",
        type: "timeline",
        data: {
          title: "Hitos",
          items: [
            { year: "2008", title: "Primer depósito en La Paz", text: "Arrancamos con tres personas y un catálogo de equipos de red." },
            { year: "2013", title: "Sucursal en Santa Cruz de la Sierra", text: "Llegamos al oriente con stock propio y servicio técnico." },
            { year: "2017", title: "Primera licitación nacional", text: "Equipamos 40 oficinas regionales en un solo proyecto." },
            { year: "2021", title: "Catálogo digital", text: "Publicamos precios y disponibilidad en línea para todo el país." },
            { year: "2026", title: "Plataforma Nexo", text: "Nuevo portal con catálogo, cotizaciones y seguimiento en tiempo real." },
          ],
        },
      },
      {
        id: "nos-stats",
        type: "stats",
        data: {
          title: null,
          items: [
            { value: 64, prefix: null, suffix: null, label: "colaboradores" },
            { value: 3, prefix: null, suffix: null, label: "sedes regionales" },
            { value: 4800, prefix: "+", suffix: null, label: "equipos instalados" },
            { value: 24, prefix: null, suffix: " h", label: "respuesta en soporte" },
          ],
        },
      },
      {
        id: "nos-galeria",
        type: "gallery",
        data: {
          title: "Dentro de Nexo",
          images: [
            { url: img("nexo-g1", 1200, 900), alt: "Depósito central con productos listos para despacho" },
            { url: img("nexo-g2", 1200, 900), alt: "Técnico configurando un rack de red" },
            { url: img("nexo-g3", 1200, 900), alt: "Reunión de planificación con un cliente institucional" },
            { url: img("nexo-g4", 1200, 900), alt: "Camión de reparto de Nexo en ruta" },
          ],
        },
      },
      {
        id: "nos-cta",
        type: "cta",
        data: {
          title: "Sumemos su institución a la red",
          text: "Agende una reunión con nuestro equipo comercial.",
          button: { label: "Contactar", href: "/contacto" },
        },
      },
    ],
  },
  {
    slug: "servicios",
    title: "Servicios",
    seo: {
      title: "Servicios",
      description: "Provisión integral, compras públicas, logística nacional, instalación y soporte para instituciones en Bolivia.",
      ogImageUrl: null,
    },
    updatedAt: UPDATED,
    blocks: [
      {
        id: "srv-hero",
        type: "hero",
        data: {
          eyebrow: "Servicios",
          title: "De la necesidad a la solución, sin vueltas",
          subtitle: "Un solo equipo responsable de cotizar, entregar, instalar y dar soporte.",
          primaryCta: { label: "Solicitar cotización", href: "/contacto" },
          secondaryCta: { label: "Ver catálogo", href: "/catalogo" },
          image: null,
        },
      },
      {
        id: "srv-features",
        type: "features",
        data: {
          title: "Qué hacemos",
          subtitle: null,
          items: [
            { icon: "package-check", title: "Provisión integral", text: "Un proveedor para tecnología, mobiliario, herramientas, electrodomésticos y vehículos.", href: "/catalogo" },
            { icon: "file-check", title: "Compras públicas", text: "Preparamos ofertas para el SICOES con fichas técnicas, garantías y plazos claros.", href: null },
            { icon: "truck", title: "Logística nacional", text: "Flota propia y aliados para entregar en los 9 departamentos.", href: null },
            { icon: "wrench", title: "Instalación", text: "Montaje de mobiliario, cableado estructurado y puesta en marcha de equipos.", href: null },
            { icon: "shield-check", title: "Garantía y soporte", text: "Mesa de ayuda, repuestos originales y técnicos en tres ciudades del eje troncal.", href: null },
            { icon: "recycle", title: "Renovación de activos", text: "Retiramos equipos usados y los reacondicionamos o reciclamos de forma responsable.", href: null },
          ],
        },
      },
      {
        id: "srv-proceso",
        type: "timeline",
        data: {
          title: "Cómo trabajamos",
          items: [
            { year: "01", title: "Diagnóstico", text: "Entendemos la necesidad, el presupuesto y los plazos de su institución." },
            { year: "02", title: "Propuesta", text: "Enviamos una cotización detallada en bolivianos en 48 horas hábiles." },
            { year: "03", title: "Entrega", text: "Coordinamos la logística y firmamos el acta de recepción." },
            { year: "04", title: "Soporte", text: "Acompañamos la garantía y el mantenimiento durante toda la vida útil." },
          ],
        },
      },
      {
        id: "srv-cta",
        type: "cta",
        data: {
          title: "Hablemos de su próximo proyecto",
          text: "Respondemos en menos de un día hábil.",
          button: { label: "Escribirnos", href: "/contacto" },
        },
      },
    ],
  },
  {
    slug: "contacto",
    title: "Contacto",
    seo: {
      title: "Contacto",
      description: "Escríbanos para cotizaciones, licitaciones o soporte. Oficinas en La Paz, Santa Cruz de la Sierra y Cochabamba.",
      ogImageUrl: null,
    },
    updatedAt: UPDATED,
    blocks: [
      {
        id: "con-hero",
        type: "hero",
        data: {
          eyebrow: "Contacto",
          title: "Conversemos",
          subtitle: "Cuéntenos qué necesita su institución y un asesor le responde en menos de un día hábil.",
          primaryCta: null,
          secondaryCta: null,
          image: null,
        },
      },
      {
        id: "con-info",
        type: "contactInfo",
        data: { title: "Oficina central", text: "También atendemos en Santa Cruz de la Sierra y Cochabamba con cita previa." },
      },
    ],
  },
];

const AUTHOR = "Equipo de Comunicación Nexo";

const baseNews: Omit<NewsDetail, "related">[] = [
  {
    id: 1,
    slug: "nexo-amplia-centro-logistico-santa-cruz",
    title: "Nexo amplía su centro logístico en Santa Cruz de la Sierra",
    excerpt: "Con 2.400 m² nuevos, reducimos a la mitad los tiempos de entrega para el oriente boliviano.",
    coverImage: { url: img("nexo-news-1", 1600, 1000), alt: "Nuevo depósito de Nexo en Santa Cruz de la Sierra" },
    author: AUTHOR,
    tags: ["Logística", "Expansión"],
    publishedAt: "2026-10-02T13:00:00Z",
    seo: {
      title: "Nexo amplía su centro logístico en Santa Cruz de la Sierra",
      description: "2.400 m² nuevos para entregas más rápidas en el oriente boliviano.",
      ogImageUrl: null,
    },
    html: "<p>Inauguramos la ampliación de nuestro centro logístico en Santa Cruz de la Sierra, que suma <strong>2.400 m²</strong> de almacenamiento y dos nuevas dársenas de carga.</p><h2>Entregas más rápidas</h2><p>Con stock regional, las instituciones de Santa Cruz, Beni y Pando recibirán sus pedidos en <strong>48 horas</strong> promedio, la mitad que antes.</p><ul><li>Área climatizada para equipos electrónicos.</li><li>Taller de servicio técnico con repuestos originales.</li><li>Punto de retiro para pedidos pequeños.</li></ul><blockquote>“Queremos que una escuela de Montero reciba su equipamiento tan rápido como una oficina en La Paz.”</blockquote><p>La ampliación generó 18 nuevos puestos de trabajo locales.</p>",
  },
  {
    id: 2,
    slug: "guia-compra-institucional-transparente",
    title: "Guía práctica: cómo preparar una compra institucional transparente",
    excerpt: "Cinco pasos para definir especificaciones, comparar ofertas y documentar cada decisión sin perder tiempo.",
    coverImage: { url: img("nexo-news-2", 1600, 1000), alt: "Documentos de una licitación sobre un escritorio" },
    author: AUTHOR,
    tags: ["Compras públicas", "Guías"],
    publishedAt: "2026-09-18T13:00:00Z",
    seo: {
      title: "Guía: compra institucional transparente",
      description: "Cinco pasos para una compra institucional clara y documentada.",
      ogImageUrl: null,
    },
    html: "<p>Una buena compra empieza mucho antes de recibir ofertas. Estos son los pasos que recomendamos a nuestros clientes.</p><h2>1. Defina el problema, no el producto</h2><p>Describa qué necesita resolver y deje que las ofertas propongan cómo.</p><h2>2. Especificaciones medibles</h2><p>Use valores verificables: potencia, garantía en meses, plazos de entrega.</p><h2>3. Compare costo total</h2><p>Incluya mantenimiento, repuestos y consumo, no solo el precio inicial.</p><h2>4. Documente cada decisión</h2><p>Un registro claro protege a la institución y al proveedor.</p><h2>5. Planifique la recepción</h2><p>Acuerde actas, responsables y pruebas de funcionamiento antes de la entrega.</p>",
  },
  {
    id: 3,
    slug: "nueva-linea-mobiliario-ergonomico",
    title: "Nueva línea de mobiliario ergonómico para oficinas públicas",
    excerpt: "Sillas, escritorios regulables y estaciones modulares pensadas para jornadas largas de atención al público.",
    coverImage: { url: img("nexo-news-3", 1600, 1000), alt: "Oficina equipada con mobiliario ergonómico" },
    author: AUTHOR,
    tags: ["Productos", "Mobiliario"],
    publishedAt: "2026-08-27T13:00:00Z",
    seo: {
      title: "Nueva línea de mobiliario ergonómico",
      description: "Mobiliario pensado para jornadas largas de atención al público.",
      ogImageUrl: null,
    },
    html: "<p>Presentamos una línea de mobiliario diseñada junto a especialistas en salud ocupacional.</p><h2>Qué incluye</h2><ul><li>Sillas con soporte lumbar regulable.</li><li>Escritorios de altura ajustable.</li><li>Estaciones modulares para mesas de entrada.</li></ul><p>Todos los productos tienen <strong>24 meses de garantía</strong> y servicio de armado incluido en La Paz, El Alto y Santa Cruz de la Sierra.</p>",
  },
];

export const mockNews: NewsDetail[] = baseNews.map((n) => ({
  ...n,
  related: baseNews
    .filter((o) => o.id !== n.id)
    .map(({ id, slug, title, excerpt, coverImage, author, tags, publishedAt }) => ({
      id,
      slug,
      title,
      excerpt,
      coverImage,
      author,
      tags,
      publishedAt,
    })),
}));
