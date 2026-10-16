export const SUPPORTED_LANGUAGES = [
  {
    id: 'c',
    name: 'C',
    extension: '.c',
    monacoLanguage: 'c',
    defaultFileName: 'main.c',
    template: `#include <stdio.h>\n\nint main() {\n    printf("Hello, CodeTogether!\\n");\n    return 0;\n}\n`,
  },
  {
    id: 'cpp',
    name: 'C++',
    extension: '.cpp',
    monacoLanguage: 'cpp',
    defaultFileName: 'main.cpp',
    template: `#include <iostream>\n\nint main() {\n    std::cout << "Hello, CodeTogether!" << std::endl;\n    return 0;\n}\n`,
  },
  {
    id: 'java',
    name: 'Java',
    extension: '.java',
    monacoLanguage: 'java',
    defaultFileName: 'Main.java',
    template: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, CodeTogether!");\n    }\n}\n`,
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    extension: '.js',
    monacoLanguage: 'javascript',
    defaultFileName: 'index.js',
    template: `console.log("Hello, CodeTogether!");\n`,
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    extension: '.ts',
    monacoLanguage: 'typescript',
    defaultFileName: 'index.ts',
    template: `const greeting: string = "Hello, CodeTogether!";\nconsole.log(greeting);\n`,
  },
  {
    id: 'python',
    name: 'Python',
    extension: '.py',
    monacoLanguage: 'python',
    defaultFileName: 'main.py',
    template: `def main():\n    print("Hello, CodeTogether!")\n\nif __name__ == "__main__":\n    main()\n`,
  },
  {
    id: 'html',
    name: 'HTML',
    extension: '.html',
    monacoLanguage: 'html',
    defaultFileName: 'index.html',
    template: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>CodeTogether Preview</title>\n</head>\n<body>\n  <h1>Hello, CodeTogether!</h1>\n  <p>Start collaborating in real time.</p>\n</body>\n</html>\n`,
  },
  {
    id: 'css',
    name: 'CSS',
    extension: '.css',
    monacoLanguage: 'css',
    defaultFileName: 'styles.css',
    template: `body {\n  font-family: system-ui, -apple-system, sans-serif;\n  background-color: #101318;\n  color: #F1F4F9;\n  padding: 2rem;\n}\n`,
  },
];

export const getLanguageConfig = (langIdentifier) => {
  if (!langIdentifier) return SUPPORTED_LANGUAGES[3]; // default JavaScript
  const normalized = langIdentifier.toLowerCase().trim();
  const found = SUPPORTED_LANGUAGES.find(
    l => l.id === normalized || l.name.toLowerCase() === normalized || normalized.includes(l.id)
  );
  return found || SUPPORTED_LANGUAGES[3];
};

export const getStarterFilesForLanguage = (langIdentifier) => {
  const lang = getLanguageConfig(langIdentifier);
  return [
    {
      name: lang.defaultFileName,
      path: lang.defaultFileName,
      language: lang.monacoLanguage,
      content: lang.template,
    },
  ];
};
