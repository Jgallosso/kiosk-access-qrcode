interface PlateData {
  plate: string;
  confidence: number;
  region?: string;
  vehicleType?: string;
  color?: string;
}

interface AnprResponse {
  success: boolean;
  data?: PlateData;
  message: string;
  processingTimeMs?: number;
  rawResponse?: any;
}

export async function processPlateWithAnpr(imageBase64: string): Promise<AnprResponse> {
  const apiToken = process.env.ANPR_API_TOKEN;
  
  if (!apiToken) {
    console.log('[ANPR API] Modo mock - ANPR_API_TOKEN no configurado');
    return mockAnprResponse();
  }

  const startTime = Date.now();

  try {
    const base64Data = imageBase64.includes('base64,') 
      ? imageBase64.split('base64,')[1] 
      : imageBase64;

    const response = await fetch('https://api.platerecognizer.com/v1/plate-reader/', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        upload: base64Data,
        regions: ['mx'],
        config: {
          mode: 'fast'
        }
      }),
    });

    const processingTimeMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ANPR API] Error HTTP:', response.status, errorText);
      return {
        success: false,
        message: `Error API: ${response.status}`,
        processingTimeMs
      };
    }

    const data = await response.json();
    
    console.log('[ANPR API] Respuesta cruda:', JSON.stringify(data, null, 2));

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      
      const plateData: PlateData = {
        plate: result.plate?.toUpperCase() || '',
        confidence: result.score || 0,
        region: result.region?.code || 'MX',
        vehicleType: result.vehicle?.type || undefined,
        color: result.vehicle?.color?.[0]?.color || undefined
      };

      console.log('[ANPR API] Placa detectada:', plateData);

      return {
        success: true,
        data: plateData,
        message: 'Placa detectada correctamente',
        processingTimeMs,
        rawResponse: data
      };
    } else {
      return {
        success: false,
        message: 'No se detectó ninguna placa en la imagen',
        processingTimeMs,
        rawResponse: data
      };
    }

  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    console.error('[ANPR API] Error:', error);
    return {
      success: false,
      message: 'Error al comunicarse con el servicio ANPR',
      processingTimeMs
    };
  }
}

function mockAnprResponse(): AnprResponse {
  const mockPlates = ['ABC-123-D', 'XYZ-789-A', 'MNO-456-B', 'DEF-321-C'];
  const randomPlate = mockPlates[Math.floor(Math.random() * mockPlates.length)];
  
  return {
    success: true,
    data: {
      plate: randomPlate,
      confidence: 0.95,
      region: 'MX',
      vehicleType: 'car',
      color: 'white'
    },
    message: 'Placa detectada (modo mock)',
    processingTimeMs: 150
  };
}

export async function validatePlate(plate: string): Promise<{ valid: boolean; message: string }> {
  const plateRegex = /^[A-Z]{3}-\d{3,4}-[A-Z]$/;
  
  if (!plate) {
    return { valid: false, message: 'Placa no proporcionada' };
  }

  const normalizedPlate = plate.toUpperCase().replace(/\s/g, '');
  
  if (plateRegex.test(normalizedPlate)) {
    return { valid: true, message: 'Formato de placa válido' };
  }

  return { valid: false, message: 'Formato de placa no reconocido' };
}
