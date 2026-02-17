const BASE_URL = 'http://localhost:3264/api';

async function testChat() {
    console.log('\n=== Тест: Текстовый чат (t2t) ===');
    try {
        const response = await fetch(`${BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'What is the capital of France?',
                model: 'qwen-max-latest'
            })
        });

        const data = await response.json();
        if (data.error) {
            console.log('FAIL:', data.error);
            return false;
        }
        console.log('OK:', data.choices[0].message.content.substring(0, 100));
        return true;
    } catch (error) {
        console.log('FAIL:', error.message);
        return false;
    }
}

async function testImageGeneration() {
    console.log('\n=== Тест: Генерация изображения (t2i) ===');
    try {
        const response = await fetch(`${BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'A beautiful sunset over a calm ocean with orange and pink clouds',
                model: 'qwen3-vl-plus',
                chatType: 't2i',
                size: '16:9'
            })
        });

        const data = await response.json();
        if (data.error) {
            console.log('FAIL:', data.error);
            return false;
        }
        console.log('OK:', data.choices[0].message.content.substring(0, 120));
        return true;
    } catch (error) {
        console.log('FAIL:', error.message);
        return false;
    }
}

async function testVideoGeneration() {
    console.log('\n=== Тест: Генерация видео (t2v) ===');
    console.log('(может занять 1-2 минуты)');
    try {
        const response = await fetch(`${BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'A serene forest with sunlight filtering through the trees',
                model: 'qwen3-vl-plus',
                chatType: 't2v',
                size: '16:9'
            })
        });

        const data = await response.json();
        if (data.error) {
            console.log('FAIL:', data.error);
            return false;
        }
        console.log('OK:', data.video_url || data.choices[0].message.content.substring(0, 120));
        return true;
    } catch (error) {
        console.log('FAIL:', error.message);
        return false;
    }
}

async function main() {
    console.log('==============================');
    console.log(' FreeQwenApi Feature Tests');
    console.log('==============================');

    const chat = await testChat();
    const image = await testImageGeneration();
    const video = await testVideoGeneration();

    console.log('\n==============================');
    console.log(' Результаты');
    console.log('==============================');
    console.log('Чат (t2t):', chat ? 'OK' : 'FAIL');
    console.log('Изображение (t2i):', image ? 'OK' : 'FAIL');
    console.log('Видео (t2v):', video ? 'OK' : 'FAIL');
    console.log('==============================\n');

    process.exit(chat && image && video ? 0 : 1);
}

main();
