<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$trimServiceUrl = 'https://a812acd7984b.ngrok-free.app';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON input']);
        exit;
    }
    
    // Validate required fields
    if (!isset($input['videoUrl']) || !isset($input['start']) || !isset($input['duration'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields: videoUrl, start, duration']);
        exit;
    }
    
    // Prepare request data
    $requestData = [
        'videoUrl' => $input['videoUrl'],
        'start' => $input['start'],
        'duration' => $input['duration']
    ];
    
    // Make request to trim service
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $trimServiceUrl . '/trim');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($requestData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        http_response_code(500);
        echo json_encode(['error' => 'CURL Error: ' . $error]);
        exit;
    }
    
    if ($httpCode !== 200) {
        http_response_code($httpCode);
        echo json_encode(['error' => 'Trim service error', 'response' => $response]);
        exit;
    }
    
    // Return the response from trim service
    echo $response;
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Handle status check
    $requestId = $_GET['requestId'] ?? null;
    
    if (!$requestId) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing requestId parameter']);
        exit;
    }
    
    // Make request to status endpoint
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $trimServiceUrl . '/status/' . $requestId);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        http_response_code(500);
        echo json_encode(['error' => 'CURL Error: ' . $error]);
        exit;
    }
    
    if ($httpCode !== 200) {
        http_response_code($httpCode);
        echo json_encode(['error' => 'Status check error', 'response' => $response]);
        exit;
    }
    
    // Return the response from status endpoint
    echo $response;
    
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>
