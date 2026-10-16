// Secure sandboxed code execution controller using Judge0 CE
const LANGUAGE_CONFIGS = {
  c: { id: 103, name: 'C (GCC 14.1.0)' },
  cpp: { id: 105, name: 'C++ (GCC 14.1.0)' },
  java: { id: 91, name: 'Java (JDK 17.0.6)' },
  python: { id: 92, name: 'Python (3.11.2)' },
  javascript: { id: 97, name: 'JavaScript (Node.js 20.17.0)' },
  typescript: { id: 94, name: 'TypeScript (5.0.3)' },
};

export const executeCode = async (req, res) => {
  try {
    const { language, code, stdin } = req.body;

    if (!language) {
      return res.status(400).json({ error: 'Language is required.' });
    }

    const langKey = language.toLowerCase().trim();
    const config = LANGUAGE_CONFIGS[langKey];

    if (!config) {
      return res.status(400).json({
        error: `Language '${language}' is not supported for compiler execution. Supported: C, C++, Java, Python, JavaScript, TypeScript. (HTML/CSS should be live previewed).`,
      });
    }

    if (code === undefined || code === null || !code.trim()) {
      return res.status(400).json({
        error: 'Source code cannot be empty.',
      });
    }

    // Safety limit on source code size (50KB max)
    if (code.length > 50000) {
      return res.status(400).json({
        error: 'Source code exceeds maximum allowed size (50KB).',
      });
    }

    // Call Judge0 CE sandboxed execution endpoint with 15s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const judge0Res = await fetch(
      'https://ce.judge0.com/submissions?base64_encoded=false&wait=true',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CodeTogether-Sandboxed-Runner/1.0',
        },
        body: JSON.stringify({
          source_code: code,
          language_id: config.id,
          stdin: stdin || '',
        }),
        signal: controller.signal,
      }
    ).finally(() => clearTimeout(timeout));

    if (!judge0Res.ok) {
      const errText = await judge0Res.text().catch(() => '');
      return res.status(502).json({
        error: `Execution service error (${judge0Res.status}): ${errText || 'Service temporarily unavailable'}`,
      });
    }

    const result = await judge0Res.json();

    const statusCode = result.status?.id;
    const statusDesc = result.status?.description || 'Executed';
    const isSuccess = statusCode === 3; // 3 = Accepted in Judge0

    return res.json({
      success: isSuccess,
      status: statusDesc,
      statusCode,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      compile_output: result.compile_output || '',
      time: result.time ? `${result.time}s` : null,
      memory: result.memory ? `${Math.round(result.memory / 1024)} MB` : null,
      language: config.name,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({
        error: 'Execution timed out after 15 seconds.',
      });
    }
    console.error('Code execution error:', err);
    return res.status(500).json({
      error: `Execution failed: ${err.message}`,
    });
  }
};
