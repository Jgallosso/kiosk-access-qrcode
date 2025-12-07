interface INEData {
  nombre: string;
  apellidos: string;
  sexo: string;
  fechaNacimiento: string;
  edad: number | null;
  domicilio: string;
  curp: string;
}

interface OcrSpaceResponse {
  ParsedResults?: Array<{
    ParsedText: string;
    ErrorMessage?: string;
  }>;
  OCRExitCode: number;
  IsErroredOnProcessing: boolean;
  ErrorMessage?: string[];
}

export async function processWithOcrSpace(base64Image: string): Promise<{ success: boolean; data?: INEData; message: string; rawText?: string }> {
  const apiKey = process.env.OCR_SPACE_API_KEY;
  
  if (!apiKey) {
    return { success: false, message: 'OCR_SPACE_API_KEY no configurada' };
  }

  try {
    const imageData = base64Image.includes('base64,') 
      ? base64Image 
      : `data:image/jpeg;base64,${base64Image}`;

    const formData = new URLSearchParams();
    formData.append('apikey', apiKey);
    formData.append('base64Image', imageData);
    formData.append('language', 'spa');
    formData.append('OCREngine', '2');

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      return { success: false, message: `Error HTTP: ${response.status}` };
    }

    const data: OcrSpaceResponse = await response.json();

    // Log sin base64 para evitar contaminar los logs
    const sanitizedData = { ...data };
    console.log('[OCR.space] Respuesta de la API recibida (sin base64)');

    if (data.IsErroredOnProcessing || !data.ParsedResults?.[0]?.ParsedText) {
      console.log('[OCR.space] Error - IsErroredOnProcessing:', data.IsErroredOnProcessing);
      console.log('[OCR.space] Error - ParsedResults:', JSON.stringify(data.ParsedResults, null, 2));
      console.log('[OCR.space] Error - ErrorMessage:', data.ErrorMessage);
      return { 
        success: false, 
        message: data.ErrorMessage?.join(', ') || 'No se pudo extraer texto de la imagen' 
      };
    }

    const rawText = data.ParsedResults[0].ParsedText;
    
    console.log('[OCR.space] Texto crudo extraído:');
    console.log('-----------------------------------');
    console.log(rawText);
    console.log('-----------------------------------');
    
    const ineData = extractINEData(rawText);
    
    console.log('[OCR.space] Datos parseados:', JSON.stringify(ineData, null, 2));

    return { 
      success: true, 
      data: ineData, 
      message: 'INE procesada correctamente',
      rawText 
    };

  } catch (error) {
    console.error('Error en OCR.space:', error);
    return { success: false, message: 'Error al comunicarse con OCR.space' };
  }
}

function extractINEData(text: string): INEData {
  const result: INEData = {
    nombre: "",
    apellidos: "",
    sexo: "",
    fechaNacimiento: "",
    edad: null,
    domicilio: "",
    curp: "",
  };

  const lines = text.split(/\r\n|\n|\r/).filter(x => x.trim() !== "");
  const upperLines = lines.map(x => x.trim().toUpperCase());

  // 1) NOMBRE + APELLIDOS
  let apellido1 = "";
  let apellido2 = "";
  let nombre = "";

  const idxNombreLabel = upperLines.indexOf('NOMBRE');
  
  if (idxNombreLabel !== -1) {
    apellido1 = lines[idxNombreLabel + 1] ?? "";
    apellido2 = lines[idxNombreLabel + 2] ?? "";
    nombre = lines[idxNombreLabel + 3] ?? "";
  }

  if (!apellido1.trim() && !apellido2.trim() && !nombre.trim()) {
    const idxCredencial = upperLines.indexOf('CREDENCIAL PARA VOTAR');
    if (idxCredencial !== -1) {
      apellido1 = lines[idxCredencial + 1] ?? "";
      apellido2 = lines[idxCredencial + 2] ?? "";
      nombre = lines[idxCredencial + 3] ?? "";
    }
  }

  result.apellidos = `${apellido1} ${apellido2}`.trim();
  result.nombre = nombre.trim();

  // 2) SEXO (H/M)
  let letter = "";

  for (const line of lines) {
    const match = line.match(/SEXO\s*([HM])\b/i);
    if (match) {
      letter = match[1].toUpperCase();
      break;
    }
  }

  if (!letter) {
    for (const line of lines) {
      const match = line.trim().match(/([HM])\s*$/i);
      if (match) {
        letter = match[1].toUpperCase();
        break;
      }
    }
  }

  if (!letter) {
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length <= 3 && /^[HM]$/i.test(trimmed)) {
        letter = trimmed.toUpperCase();
        break;
      }
    }
  }

  if (letter === "H") {
    result.sexo = "Masculino";
  } else if (letter === "M") {
    result.sexo = "Femenino";
  }

  // 3) FECHA DE NACIMIENTO
  let fecha = "";
  
  for (let i = 0; i < upperLines.length; i++) {
    if (upperLines[i].includes('FECHA DE NACIMIENTO')) {
      fecha = lines[i + 1] ?? "";
      break;
    }
  }

  if (!fecha) {
    const dateMatch = text.match(/\d{2}\/\d{2}\/\d{4}/);
    if (dateMatch) {
      fecha = dateMatch[0];
    }
  }

  if (fecha) {
    result.fechaNacimiento = fecha;
    try {
      const parts = fecha.split('/');
      if (parts.length === 3) {
        const birthDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        result.edad = age;
      }
    } catch (e) {
      result.edad = null;
    }
  }

  // 4) DOMICILIO
  let domicilio = "";
  let idxDomLabel: number | null = null;

  for (let i = 0; i < upperLines.length; i++) {
    if (upperLines[i] === 'DOMICILIO' || levenshtein(upperLines[i], 'DOMICILIO') <= 2) {
      idxDomLabel = i;
      break;
    }
  }

  if (idxDomLabel !== null) {
    const domParts: string[] = [];
    for (let j = 1; j <= 3; j++) {
      if (lines[idxDomLabel + j]) {
        domParts.push(lines[idxDomLabel + j]);
      }
    }
    domicilio = domParts.join(" ").trim();
  } else {
    let start: number | null = null;
    for (let i = 0; i < lines.length; i++) {
      if (/\b(CALZ|CALLE|AV\.?|BLVD|FRACC|COL|PROF)\b/i.test(lines[i])) {
        start = i;
        break;
      }
    }

    if (start !== null) {
      const domParts: string[] = [];
      for (let j = 0; j <= 2; j++) {
        if (lines[start + j]) {
          domParts.push(lines[start + j]);
        }
      }
      domicilio = domParts.join(" ").trim();
    }
  }

  result.domicilio = domicilio;

  // 5) CURP
  let curp = "";
  
  for (const line of lines) {
    const match = line.match(/CURP\s+([A-Z0-9]+)/i);
    if (match) {
      curp = match[1];
      break;
    }
  }

  if (!curp) {
    const curpMatch = text.match(/[A-Z]{4}\d{6}[A-Z0-9]{8}/);
    if (curpMatch) {
      curp = curpMatch[0];
    }
  }

  result.curp = curp;

  return result;
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
