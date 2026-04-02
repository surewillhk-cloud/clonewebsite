/**
 * Expo 项目脚手架生成
 * 根据 APP 界面分析结果生成 React Native / Expo 项目
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import type { AppScreenAnalysis } from '@/types/app-analyzer';
import { generateRNComponent } from './rn-component-generator';
import { generateApiCode } from './api-code-generator';

function getComponentName(blockType: string, index: number, seen: Set<string>): string {
  const base = blockType
    .replace(/\s+/g, '')
    .replace(/^./, (c) => c.toUpperCase());
  const name = base || `Block${index}`;
  if (seen.has(name)) return `${name}${index}`;
  seen.add(name);
  return name;
}

export interface ExpoBuildResult {
  projectPath: string;
  zipPath: string;
}

export async function buildExpoProject(
  analysis: AppScreenAnalysis,
  taskId: string
): Promise<ExpoBuildResult> {
  const projectDir = path.join(os.tmpdir(), `ch007ai-app-${taskId}`);
  await fs.mkdir(projectDir, { recursive: true });

  const componentsDir = path.join(projectDir, 'components');
  const servicesDir = path.join(projectDir, 'services');
  const typesDir = path.join(projectDir, 'types');
  await fs.mkdir(componentsDir, { recursive: true });
  await fs.mkdir(servicesDir, { recursive: true });
  await fs.mkdir(typesDir, { recursive: true });

  const { screens, colorTheme, apiEndpoints } = analysis;

  // 流量抓包模式：生成 API 调用层
  if (apiEndpoints && apiEndpoints.length > 0) {
    try {
      const { servicesCode, typesCode } = await generateApiCode(apiEndpoints);
      await fs.writeFile(path.join(servicesDir, 'api.ts'), servicesCode, 'utf-8');
      await fs.writeFile(path.join(typesDir, 'api.ts'), typesCode, 'utf-8');
    } catch (err) {
      console.warn('[expo-builder] API code generation failed, using placeholder:', err);
      await fs.writeFile(
        path.join(servicesDir, 'api.ts'),
        `export const BASE_URL = '';\nexport async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {\n  const res = await fetch(path.startsWith('http') ? path : BASE_URL + path, init);\n  if (!res.ok) throw new Error(\`API error \${res.status}\`);\n  return res.json();\n}\n`,
        'utf-8'
      );
      await fs.writeFile(path.join(typesDir, 'api.ts'), `export interface ApiResponse<T> { data?: T; error?: string; }\n`, 'utf-8');
    }
  }
  const primaryScreen = screens[0] ?? { name: 'MainScreen', blocks: [] };
  const seenNames = new Set<string>();
  const imports: string[] = [];
  const elements: string[] = [];

  for (let i = 0; i < primaryScreen.blocks.length; i++) {
    const block = primaryScreen.blocks[i];
    const componentName = getComponentName(block.type, i, seenNames);
    const fileName = `${componentName}.tsx`;

    try {
      const code = await generateRNComponent(block, colorTheme ?? {});
      await fs.writeFile(path.join(componentsDir, fileName), code, 'utf-8');
      imports.push(`import ${componentName} from './components/${componentName}';`);
      elements.push(`        <${componentName} />`);
    } catch (err) {
      console.warn(`[expo-builder] Failed to generate ${componentName}, using placeholder:`, err);
      const fallback = `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ${componentName}() {
  return (
    <View style={styles.container}>
      <Text>${block.title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({ container: { padding: 16 } });`;
      await fs.writeFile(path.join(componentsDir, fileName), fallback, 'utf-8');
      imports.push(`import ${componentName} from './components/${componentName}';`);
      elements.push(`        <${componentName} />`);
    }
  }

  const appTsx = `import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, View } from 'react-native';
${imports.join('\n')}

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.scroll}>
${elements.join('\n')}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '${colorTheme?.background ?? '#ffffff'}' },
  scroll: { paddingVertical: 24 },
});`;

  const appJson = {
    name: 'cloned-app',
    slug: 'cloned-app',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    splash: {
      resizeMode: 'contain',
      backgroundColor: colorTheme?.primary ?? '#4F7EFF',
    },
    updates: { fallback: 'static' },
    assetBundlePatterns: ['**/*'],
  };

  const packageJson = {
    name: 'cloned-app',
    version: '1.0.0',
    main: 'App.tsx',
    scripts: {
      start: 'expo start',
      android: 'expo start --android',
      ios: 'expo start --ios',
    },
    dependencies: {
      expo: '~52.0.0',
      'expo-status-bar': '~2.0.0',
      react: '18.3.1',
      'react-native': '0.76.3',
    },
    devDependencies: {
      '@babel/core': '^7.25.2',
      'babel-preset-expo': '~12.0.0',
      typescript: '~5.3.0',
    },
    private: true,
  };

  const tsconfig = {
    extends: 'expo/tsconfig.base',
    compilerOptions: { strict: true },
    include: ['**/*.ts', '**/*.tsx'],
  };

  const babelConfig = `module.exports = function(api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};`;

  const readme = `# Cloned App - CH007

Generated by CH007 from your APP screenshots.

## Run locally

\`\`\`bash
npm install
npx expo start
\`\`\`

Then scan the QR code with Expo Go (Android) or Camera (iOS).
`;

  await fs.writeFile(path.join(projectDir, 'App.tsx'), appTsx, 'utf-8');
  await fs.writeFile(
    path.join(projectDir, 'app.json'),
    JSON.stringify(appJson, null, 2),
    'utf-8'
  );
  await fs.writeFile(
    path.join(projectDir, 'package.json'),
    JSON.stringify(packageJson, null, 2),
    'utf-8'
  );
  await fs.writeFile(
    path.join(projectDir, 'tsconfig.json'),
    JSON.stringify(tsconfig, null, 2),
    'utf-8'
  );
  await fs.writeFile(path.join(projectDir, 'babel.config.js'), babelConfig, 'utf-8');
  await fs.writeFile(path.join(projectDir, 'README.md'), readme, 'utf-8');

  const zipPath = path.join(os.tmpdir(), `ch007ai-app-${taskId}.zip`);
  await createZip(projectDir, zipPath);

  return { projectPath: projectDir, zipPath };
}

async function createZip(sourceDir: string, outputPath: string): Promise<void> {
  const archiver = (await import('archiver')).default;
  const output = (await import('fs')).createWriteStream(outputPath);
  const archive = archiver('zip', { zlib: { level: 5 } });

  return new Promise((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(sourceDir, 'cloned-app');
    archive.finalize();
  });
}
