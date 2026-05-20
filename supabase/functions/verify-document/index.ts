import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper: Levenshtein distance for fuzzy matching (Memory-efficient 2-row approach)
function getSimilarity(s1: string, s2: string): number {
    s1 = s1.toLowerCase().trim();
    s2 = s2.toLowerCase().trim();
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 100;
    const len1 = s1.length;
    const len2 = s2.length;
    let prevRow = new Int32Array(len2 + 1);
    let currRow = new Int32Array(len2 + 1);

    for (let j = 0; j <= len2; j++) prevRow[j] = j;

    for (let i = 1; i <= len1; i++) {
        currRow[0] = i;
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            currRow[j] = Math.min(prevRow[j] + 1, currRow[j - 1] + 1, prevRow[j - 1] + cost);
        }
        [prevRow, currRow] = [currRow, prevRow];
    }
    const distance = prevRow[len2];
    return Math.max(0, (1 - distance / Math.max(len1, len2)) * 100);
}

// Helper: Get image dimensions from binary header
function getImageDimensions(buffer: ArrayBuffer): { width: number, height: number } | null {
    try {
        const bytes = new Uint8Array(buffer);
        if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
            const width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
            const height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
            return { width, height };
        }
        if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
            let offset = 2;
            while (offset < bytes.length - 8) {
                if (bytes[offset] === 0xFF) {
                    const marker = bytes[offset + 1];
                    if (marker >= 0xC0 && marker <= 0xC3) {
                        const height = (bytes[offset + 5] << 8) | bytes[offset + 6];
                        const width = (bytes[offset + 7] << 8) | bytes[offset + 8];
                        return { width, height };
                    }
                    offset += 2 + ((bytes[offset + 2] << 8) | bytes[offset + 3]);
                } else offset++;
            }
        }
    } catch (e) {
        console.error("Dim Check Error:", e);
    }
    return null;
}

const extractTextFromImage = async (imageBase64: string, isPdf: boolean) => {
    const apiKey = Deno.env.get("GOOGLE_VISION_API_KEY");
    if (!apiKey) throw new Error("GOOGLE_VISION_API_KEY is not configured.");

    let url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
    let requestBody = {
        requests: [{
            image: { content: imageBase64 },
            features: [{ type: "TEXT_DETECTION" }]
        }]
    };

    if (isPdf) {
        url = `https://vision.googleapis.com/v1/files:annotate?key=${apiKey}`;
        requestBody = {
            requests: [{
                inputConfig: {
                    content: imageBase64,
                    mimeType: "application/pdf"
                },
                features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
                pages: [1]
            }]
        } as any;
    }

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    if (isPdf) {
        return data.responses?.[0]?.responses?.[0]?.fullTextAnnotation?.text || "";
    }
    return data.responses?.[0]?.fullTextAnnotation?.text || "";
};

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const { document_path, user_id, user_type, provided_email, full_name, college_name: req_college_name, campus_name: req_campus_name } = await req.json()
        const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

        // 1. File Type restriction
        const fileExt = document_path.split('.').pop()?.toLowerCase();
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
        if (!fileExt || !allowedExtensions.includes(fileExt)) {
            return new Response(JSON.stringify({ error: "Only JPG, PNG, or PDF files are accepted." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
        }

        // 2. Download Document
        const { data: fileData, error: downloadError } = await supabase.storage.from('verification-documents').download(document_path)
        if (downloadError) throw downloadError

        const arrayBuffer = await fileData.arrayBuffer();

        // 3. Image Quality check (Min 200x200 resolution)
        if (fileExt !== 'pdf') {
            const dims = getImageDimensions(arrayBuffer);
            if (dims && (dims.width < 200 || dims.height < 200)) {
                return new Response(JSON.stringify({ error: "Image too small or low quality. Please upload a clearer photo (minimum 200x200 resolution)." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
            }
        }

        // 4. Resolve Identity for matching
        let userName = full_name || "";
        let collegeName = req_college_name || "";
        let campusName = req_campus_name || "";

        if (user_id) {
            const { data: userData, error: userError } = await supabase.from('users').select('name, college').eq('id', user_id).single()
            if (!userError && userData) {
                userName = userData.name || userName;
                collegeName = userData.college || collegeName;
            }
        }

        // 5. Perform OCR via Google Vision API OR Demo Mode
        let extractedText = "";
        const isDemoMode = Deno.env.get("OCR_DEMO_MODE") === "true";

        if (isDemoMode) {
            // Simulated OCR Success for testing onboarding flow
            console.log("OCR running in DEMO MODE (Secret: OCR_DEMO_MODE=true)");
            extractedText = `STUDENT IDENTITY CARD\nName: ${userName}\nCollege: ${collegeName}\nEnrollment No: 123456789\nRegistration: Academic Session 2024-25`;
        } else {
            try {
                const base64 = encodeBase64(new Uint8Array(arrayBuffer));
                extractedText = await extractTextFromImage(base64, fileExt === 'pdf');
            } catch (ocrError: any) {
                console.error("Vision API OCR Error:", ocrError);
                
                // Return specific instruction for billing if detected
                if (ocrError.message?.includes("billing to be enabled")) {
                    return new Response(JSON.stringify({ 
                        error: "ID Verification requires a linked billing account on Google Cloud. Please enable billing or use Demo Mode for testing.",
                        details: "GOOGLE_BILLING_REQUIRED",
                        demoModeInstruction: "To bypass this for testing: Add secret 'OCR_DEMO_MODE=true' in your Supabase Dashboard."
                    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
                }

                return new Response(JSON.stringify({ 
                    error: `Cloud Verification Service Error: ${ocrError.message || "Unknown error"}`,
                    details: "Check your Supabase Secrets for GOOGLE_VISION_API_KEY"
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
            }
        }

        // 5. Minimum text length check (Maintain 50 characters)
        if (extractedText.trim().length < 50) {
            return new Response(JSON.stringify({ error: "Document is blank or unreadable. Please upload a clear image of your student ID." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
        }

        // 6. Document Type Detection (First Gate - Maintain keyword logic)
        const keywords = ["student", "enrollment", "roll no", "reg no", "registration", "college", "university", "institute", "department", "admitted", "academic", "semester", "batch", "id card", "identity"];
        const lowerOCR = extractedText.toLowerCase();
        const matchedKeywordsCount = keywords.filter(kw => lowerOCR.includes(kw)).length;
        if (matchedKeywordsCount < 2) {
            return new Response(JSON.stringify({ error: "This doesn't appear to be a valid student ID or college document." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
        }

        // 7. Match Logic against User details
        // Note: userName and collegeName were already resolved in Step 4

        // Raised Score Threshold to 85%
        // We now check for the best match line-by-line to avoid document-length penalties
        const lines = extractedText.split('\n').filter(l => l.trim().length > 0);
        const labelsToStrip = ["name", "student", "college", "university", "campus", "institute", "id card", "identity"];
        
        let nameScore = 0;
        let collegeScore = 0;
        let campusScore = 0;

        const lowerUserName = userName.toLowerCase().trim();
        const lowerCollegeName = collegeName.toLowerCase().trim();
        const lowerCampusName = campusName.toLowerCase().trim();

        for (let line of lines) {
            let cleanLine = line.toLowerCase().trim();
            // Strip leading labels and punctuation often generated by OCR
            for (const label of labelsToStrip) {
                const regex = new RegExp(`^${label}\\s*[:\\- ]*`, "i");
                cleanLine = cleanLine.replace(regex, "").trim();
            }

            // 1. Direct Substring Check (High confidence boost)
            if (lowerUserName && cleanLine.includes(lowerUserName)) nameScore = 100;
            if (lowerCollegeName && cleanLine.includes(lowerCollegeName)) collegeScore = 100;
            if (lowerCampusName && cleanLine.includes(lowerCampusName)) campusScore = 100;

            // 2. Fuzzy Match as Fallback
            if (nameScore < 100) {
                const currentNameScore = getSimilarity(userName, cleanLine);
                if (currentNameScore > nameScore) nameScore = currentNameScore;
            }
            if (collegeScore < 100) {
                const currentCollegeScore = getSimilarity(collegeName, cleanLine);
                if (currentCollegeScore > collegeScore) collegeScore = currentCollegeScore;
            }
            if (campusScore < 100) {
                const currentCampusScore = getSimilarity(campusName, cleanLine);
                if (currentCampusScore > campusScore) campusScore = currentCampusScore;
            }
        }

        // Verification passes if Name matches AND (College matches OR Campus matches)
        const isVerified = nameScore >= 85 && (collegeScore >= 85 || campusScore >= 85);
        const verificationStatus = isVerified ? 'verified' : 'pending';

        if (!isVerified) {
            let reason = "";
            if (nameScore < 85) reason = "Name mismatch on document.";
            else reason = "Neither College nor Campus name matched the document.";
            
            return new Response(JSON.stringify({
                error: `Verification failed. ${reason} (Confidence: ${Math.round((nameScore + Math.max(collegeScore, campusScore)) / 2)}%)`,
                details: { nameScore, collegeScore, campusScore, extractedTextSnippet: extractedText.slice(0, 100) }
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
        }

        // 8. Update User Status if registered
        if (user_id) {
            const { error: updateError } = await supabase.from('users').update({ verification_status: verificationStatus }).eq('id', user_id)
            if (updateError) console.error("Update Error:", updateError);
        }

        return new Response(JSON.stringify({
            success: true,
            status: verificationStatus,
            confidence: Math.round((nameScore + collegeScore) / 2)
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    } catch (error: any) {
        console.error("Function Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }
})
