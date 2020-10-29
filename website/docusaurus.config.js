module.exports = {
  title: 'Datadive JS SDK Docs',
  tagline: 'Datadive JavaScript SDK',
  url: 'https://datadive-ai.github.io',
  baseUrl: '/dave-JavaScript/',
  onBrokenLinks: 'throw',
  favicon: 'img/dave_favicon.ico',
  organizationName: 'datadive-ai',
  projectName: 'dave-JavaScript',
  themeConfig: {
    sidebarCollapsible: false,
    navbar: {
      logo: {
        alt: 'Datadive Logo',
        src: 'img/dave_logo.svg',
      },
      hideOnScroll: true,
      items: [
        {
          href: 'https://github.com/datadive-ai/dave-JavaScript/',
          label: 'GitHub',
          position: 'left',
        },
      ],
    },
    footer: {
      logo: {
        alt: 'Datadive Logo',
        src: 'img/dave_logo.svg',
      },
      copyright: `Copyright © ${new Date().getFullYear()} Datadive, Inc.`,
    },
    prism: {
      defaultLanguage: 'javascript',
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          homePageId: 'DatadiveClient',
          path: 'docs',
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl:
            'https://github.com/datadive-ai/dave-JavaScript/website',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
