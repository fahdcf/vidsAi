@extends('layouts.app')

@section('title', 'Create New Video')

@push('styles')
<style>
    .step {
        display: none;
    }
    .step.active {
        display: block;
    }
    .form-check-input:checked + .form-check-label {
        color: var(--primary-color);
        font-weight: 600;
    }
</style>
@endpush

@section('content')
<div class="container py-5">
    <div class="row justify-content-center">
        <div class="col-lg-8">
            <!-- Progress Bar -->
            <div class="card mb-4">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            <div class="progress-step active me-3" id="step-1">1</div>
                            <span class="fw-bold">General Info</span>
                        </div>
                        <div class="d-flex align-items-center">
                            <div class="progress-step me-3" id="step-2">2</div>
                            <span>Script Options</span>
                        </div>
                        <div class="d-flex align-items-center">
                            <div class="progress-step me-3" id="step-3">3</div>
                            <span>Voiceover</span>
                        </div>
                        <div class="d-flex align-items-center">
                            <div class="progress-step me-3" id="step-4">4</div>
                            <span>Submit</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Form -->
            <form method="POST" action="{{ route('projects.store') }}" enctype="multipart/form-data" id="videoForm">
                @csrf
                
                <!-- Step 1: General Info -->
                <div class="step active" id="step-content-1">
                    <div class="card">
                        <div class="card-header">
                            <h4 class="mb-0"><i class="bi bi-info-circle"></i> General Information</h4>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <label for="name" class="form-label">Project Name *</label>
                                <input type="text" class="form-control @error('name') is-invalid @enderror" 
                                       id="name" name="name" value="{{ old('name') }}" required>
                                @error('name')
                                    <div class="invalid-feedback">{{ $message }}</div>
                                @enderror
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Type *</label>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-check form-check-card">
                                            <input class="form-check-input" type="radio" name="type" id="type-product" value="product" {{ old('type') == 'product' ? 'checked' : '' }} required>
                                            <label class="form-check-label w-100 p-3 border rounded" for="type-product">
                                                <i class="bi bi-box display-6 text-primary d-block mb-2"></i>
                                                <strong>Product</strong>
                                                <br><small class="text-muted">Physical or digital products</small>
                                            </label>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-check form-check-card">
                                            <input class="form-check-input" type="radio" name="type" id="type-service" value="service" {{ old('type') == 'service' ? 'checked' : '' }}>
                                            <label class="form-check-label w-100 p-3 border rounded" for="type-service">
                                                <i class="bi bi-gear display-6 text-primary d-block mb-2"></i>
                                                <strong>Service</strong>
                                                <br><small class="text-muted">Professional services</small>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                @error('type')
                                    <div class="text-danger small">{{ $message }}</div>
                                @enderror
                            </div>
                            
                            <div class="mb-3">
                                <label for="category" class="form-label">Category *</label>
                                <select class="form-select @error('category') is-invalid @enderror" id="category" name="category" required>
                                    <option value="">Select a category</option>
                                    <option value="tech" {{ old('category') == 'tech' ? 'selected' : '' }}>Technology</option>
                                    <option value="beauty" {{ old('category') == 'beauty' ? 'selected' : '' }}>Beauty & Cosmetics</option>
                                    <option value="food" {{ old('category') == 'food' ? 'selected' : '' }}>Food & Beverage</option>
                                    <option value="fashion" {{ old('category') == 'fashion' ? 'selected' : '' }}>Fashion</option>
                                    <option value="health" {{ old('category') == 'health' ? 'selected' : '' }}>Health & Fitness</option>
                                    <option value="finance" {{ old('category') == 'finance' ? 'selected' : '' }}>Finance</option>
                                    <option value="education" {{ old('category') == 'education' ? 'selected' : '' }}>Education</option>
                                    <option value="travel" {{ old('category') == 'travel' ? 'selected' : '' }}>Travel</option>
                                    <option value="other" {{ old('category') == 'other' ? 'selected' : '' }}>Other</option>
                                </select>
                                @error('category')
                                    <div class="invalid-feedback">{{ $message }}</div>
                                @enderror
                            </div>
                            
                            <div class="mb-3">
                                <label for="description" class="form-label">Description *</label>
                                <textarea class="form-control @error('description') is-invalid @enderror" 
                                          id="description" name="description" rows="4" required 
                                          placeholder="Describe your product or service in detail. This will help AI generate better content.">{{ old('description') }}</textarea>
                                @error('description')
                                    <div class="invalid-feedback">{{ $message }}</div>
                                @enderror
                            </div>
                            
                            <div class="mb-3">
                                <label for="language" class="form-label">Language *</label>
                                <select class="form-select @error('language') is-invalid @enderror" id="language" name="language" required>
                                    <option value="english" {{ old('language') == 'english' ? 'selected' : '' }}>English</option>
                                    <option value="arabic" {{ old('language') == 'arabic' ? 'selected' : '' }}>Arabic</option>
                                    <option value="french" {{ old('language') == 'french' ? 'selected' : '' }}>French</option>
                                    <option value="spanish" {{ old('language') == 'spanish' ? 'selected' : '' }}>Spanish</option>
                                    <option value="german" {{ old('language') == 'german' ? 'selected' : '' }}>German</option>
                                </select>
                                @error('language')
                                    <div class="invalid-feedback">{{ $message }}</div>
                                @enderror
                            </div>

                            <div class="mb-3">
                                <label class="form-label">Video Format *</label>
                                <div class="row">
                                    <div class="col-md-3">
                                        <div class="form-check form-check-card">
                                            <input class="form-check-input" type="checkbox" name="video_format[]" id="format-16-9" value="16:9" {{ in_array('16:9', old('video_format', [])) ? 'checked' : '' }}>
                                            <label class="form-check-label w-100 p-3 border rounded text-center" for="format-16-9">
                                                <div class="ratio ratio-16x9 bg-light mb-2 mx-auto" style="max-width: 80px;">
                                                    <div class="d-flex align-items-center justify-content-center">
                                                        <i class="bi bi-play-fill text-primary"></i>
                                                    </div>
                                                </div>
                                                <strong>16:9</strong>
                                                <br><small class="text-muted">Landscape</small>
                                            </label>
                                        </div>
                                    </div>
                                    <div class="col-md-3">
                                        <div class="form-check form-check-card">
                                            <input class="form-check-input" type="checkbox" name="video_format[]" id="format-1-1" value="1:1" {{ in_array('1:1', old('video_format', [])) ? 'checked' : '' }}>
                                            <label class="form-check-label w-100 p-3 border rounded text-center" for="format-1-1">
                                                <div class="ratio ratio-1x1 bg-light mb-2 mx-auto" style="max-width: 60px;">
                                                    <div class="d-flex align-items-center justify-content-center">
                                                        <i class="bi bi-play-fill text-primary"></i>
                                                    </div>
                                                </div>
                                                <strong>1:1</strong>
                                                <br><small class="text-muted">Square</small>
                                            </label>
                                        </div>
                                    </div>
                                    <div class="col-md-3">
                                        <div class="form-check form-check-card">
                                            <input class="form-check-input" type="checkbox" name="video_format[]" id="format-9-16" value="9:16" {{ in_array('9:16', old('video_format', [])) ? 'checked' : '' }}>
                                            <label class="form-check-label w-100 p-3 border rounded text-center" for="format-9-16">
                                                <div class="bg-light mb-2 mx-auto d-flex align-items-center justify-content-center" style="width: 40px; height: 70px;">
                                                    <i class="bi bi-play-fill text-primary"></i>
                                                </div>
                                                <strong>9:16</strong>
                                                <br><small class="text-muted">Portrait</small>
                                            </label>
                                        </div>
                                    </div>
                                    <div class="col-md-3">
                                        <div class="form-check form-check-card">
                                            <input class="form-check-input" type="checkbox" name="video_format[]" id="format-all" value="all" {{ in_array('all', old('video_format', [])) ? 'checked' : '' }}>
                                            <label class="form-check-label w-100 p-3 border rounded text-center" for="format-all">
                                                <div class="mb-2">
                                                    <i class="bi bi-collection-play display-6 text-success"></i>
                                                </div>
                                                <strong>All Formats</strong>
                                                <br><small class="text-muted">Generate all</small>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                @error('video_format')
                                    <div class="text-danger small">{{ $message }}</div>
                                @enderror
                                <div class="form-text">Select one or more video formats. Choose "All Formats" to generate videos in all aspect ratios.</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Step 2: Script Options -->
                <div class="step" id="step-content-2">
                    <div class="card">
                        <div class="card-header">
                            <h4 class="mb-0"><i class="bi bi-file-text"></i> Script Options</h4>
                        </div>
                        <div class="card-body">
                            <div class="mb-4">
                                <label class="form-label">Script Option *</label>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="script_option" id="script-generate" value="generate" {{ old('script_option') == 'generate' ? 'checked' : '' }} required>
                                            <label class="form-check-label w-100 p-3 border rounded" for="script-generate">
                                                <strong><i class="bi bi-magic"></i> Generate Script from Description</strong>
                                                <br><small class="text-muted">AI will create a script based on your description</small>
                                            </label>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="script_option" id="script-paste" value="paste" {{ old('script_option') == 'paste' ? 'checked' : '' }}>
                                            <label class="form-check-label w-100 p-3 border rounded" for="script-paste">
                                                <strong><i class="bi bi-file-earmark-text"></i> I Will Paste My Script</strong>
                                                <br><small class="text-muted">Use your own pre-written script</small>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="mb-3" id="custom-script-section" style="display: none;">
                                <label for="custom_script" class="form-label">Your Script *</label>
                                <textarea class="form-control @error('custom_script') is-invalid @enderror" 
                                          id="custom_script" name="custom_script" rows="6" 
                                          placeholder="Paste your video script here...">{{ old('custom_script') }}</textarea>
                                @error('custom_script')
                                    <div class="invalid-feedback">{{ $message }}</div>
                                @enderror
                                <div class="form-text">Maximum 5000 characters</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Step 3: Voiceover Options -->
                <div class="step" id="step-content-3">
                    <div class="card">
                        <div class="card-header">
                            <h4 class="mb-0"><i class="bi bi-mic"></i> Voiceover Options</h4>
                        </div>
                        <div class="card-body">
                            <div class="mb-4">
                                <label class="form-label">Voiceover Option *</label>
                                <div class="row">
                                    <div class="col-md-4">
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="voiceover_option" id="voice-ai" value="ai" {{ old('voiceover_option') == 'ai' ? 'checked' : '' }} required>
                                            <label class="form-check-label w-100 p-3 border rounded text-center" for="voice-ai">
                                                <i class="bi bi-robot display-6 text-primary d-block mb-2"></i>
                                                <strong>Generate Voice using AI</strong>
                                                <br><small class="text-muted">AI-generated voice</small>
                                            </label>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="voiceover_option" id="voice-upload" value="upload" {{ old('voiceover_option') == 'upload' ? 'checked' : '' }}>
                                            <label class="form-check-label w-100 p-3 border rounded text-center" for="voice-upload">
                                                <i class="bi bi-upload display-6 text-primary d-block mb-2"></i>
                                                <strong>Upload Your Voice File</strong>
                                                <br><small class="text-muted">MP3 or WAV file</small>
                                            </label>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="voiceover_option" id="voice-none" value="none" {{ old('voiceover_option') == 'none' ? 'checked' : '' }}>
                                            <label class="form-check-label w-100 p-3 border rounded text-center" for="voice-none">
                                                <i class="bi bi-volume-mute display-6 text-primary d-block mb-2"></i>
                                                <strong>No Voice-over</strong>
                                                <br><small class="text-muted">Text and visuals only</small>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="mb-3" id="voice-upload-section" style="display: none;">
                                <label for="voiceover_file" class="form-label">Upload Voice File</label>
                                <input type="file" class="form-control @error('voiceover_file') is-invalid @enderror" 
                                       id="voiceover_file" name="voiceover_file" accept=".mp3,.wav">
                                @error('voiceover_file')
                                    <div class="invalid-feedback">{{ $message }}</div>
                                @enderror
                                <div class="form-text">Supported formats: MP3, WAV. Maximum size: 10MB</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Step 4: Submit -->
                <div class="step" id="step-content-4">
                    <div class="card">
                        <div class="card-header">
                            <h4 class="mb-0"><i class="bi bi-check-circle"></i> Review & Submit</h4>
                        </div>
                        <div class="card-body">
                            <div class="alert alert-info">
                                <i class="bi bi-info-circle"></i>
                                <strong>Almost there!</strong> Review your settings and click "Generate My Video" to start the AI video creation process.
                            </div>
                            
                            <div id="review-content">
                                <!-- Review content will be populated by JavaScript -->
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Navigation Buttons -->
                <div class="d-flex justify-content-between mt-4">
                    <button type="button" class="btn btn-outline-secondary" id="prevBtn" onclick="changeStep(-1)" style="display: none;">
                        <i class="bi bi-arrow-left"></i> Previous
                    </button>
                    <div></div>
                    <button type="button" class="btn btn-primary" id="nextBtn" onclick="changeStep(1)">
                        Next <i class="bi bi-arrow-right"></i>
                    </button>
                    <button type="submit" class="btn btn-success btn-lg" id="submitBtn" style="display: none;">
                        <i class="bi bi-magic"></i> Generate My Video
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

@push('scripts')
<script>
let currentStep = 1;
const totalSteps = 4;

function showStep(step) {
    // Hide all steps
    document.querySelectorAll('.step').forEach(el => {
        el.classList.remove('active');
    });
    
    // Show current step
    document.getElementById(`step-content-${step}`).classList.add('active');
    
    // Update progress indicators
    document.querySelectorAll('.progress-step').forEach((el, index) => {
        el.classList.remove('active', 'completed');
        if (index + 1 < step) {
            el.classList.add('completed');
        } else if (index + 1 === step) {
            el.classList.add('active');
        }
    });
    
    // Update navigation buttons
    document.getElementById('prevBtn').style.display = step === 1 ? 'none' : 'inline-block';
    document.getElementById('nextBtn').style.display = step === totalSteps ? 'none' : 'inline-block';
    document.getElementById('submitBtn').style.display = step === totalSteps ? 'inline-block' : 'none';
    
    // Populate review content on last step
    if (step === totalSteps) {
        populateReview();
    }
}

function changeStep(direction) {
    if (direction === 1 && !validateCurrentStep()) {
        return;
    }
    
    currentStep += direction;
    if (currentStep < 1) currentStep = 1;
    if (currentStep > totalSteps) currentStep = totalSteps;
    
    showStep(currentStep);
}

function validateCurrentStep() {
    const step = currentStep;
    let isValid = true;
    
    if (step === 1) {
        // Validate general info
        const required = ['name', 'type', 'category', 'description', 'language'];
        required.forEach(field => {
            const element = document.querySelector(`[name="${field}"]`);
            if (!element.value) {
                element.classList.add('is-invalid');
                isValid = false;
            } else {
                element.classList.remove('is-invalid');
            }
        });

        // Validate video format selection
        const videoFormatChecked = document.querySelectorAll('[name="video_format[]"]:checked');
        if (videoFormatChecked.length === 0) {
            // Show error for video format
            const videoFormatError = document.querySelector('.video-format-error');
            if (!videoFormatError) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'text-danger small video-format-error';
                errorDiv.textContent = 'Please select at least one video format.';
                document.querySelector('[name="video_format[]"]').closest('.mb-3').appendChild(errorDiv);
            }
            isValid = false;
        } else {
            // Remove error if exists
            const videoFormatError = document.querySelector('.video-format-error');
            if (videoFormatError) {
                videoFormatError.remove();
            }
        }
    } else if (step === 2) {
        // Validate script options
        const scriptOption = document.querySelector('[name="script_option"]:checked');
        if (!scriptOption) {
            isValid = false;
        } else if (scriptOption.value === 'paste') {
            const customScript = document.querySelector('[name="custom_script"]');
            if (!customScript.value) {
                customScript.classList.add('is-invalid');
                isValid = false;
            } else {
                customScript.classList.remove('is-invalid');
            }
        }
    } else if (step === 3) {
        // Validate voiceover options
        const voiceOption = document.querySelector('[name="voiceover_option"]:checked');
        if (!voiceOption) {
            isValid = false;
        } else if (voiceOption.value === 'upload') {
            const voiceFile = document.querySelector('[name="voiceover_file"]');
            if (!voiceFile.files.length) {
                voiceFile.classList.add('is-invalid');
                isValid = false;
            } else {
                voiceFile.classList.remove('is-invalid');
            }
        }
    }
    
    return isValid;
}

function populateReview() {
    const reviewContent = document.getElementById('review-content');
    const name = document.querySelector('[name="name"]').value;
    const type = document.querySelector('[name="type"]:checked')?.value;
    const category = document.querySelector('[name="category"]').value;
    const description = document.querySelector('[name="description"]').value;
    const language = document.querySelector('[name="language"]').value;
    const videoFormats = Array.from(document.querySelectorAll('[name="video_format[]"]:checked')).map(cb => cb.value);
    const scriptOption = document.querySelector('[name="script_option"]:checked')?.value;
    const voiceOption = document.querySelector('[name="voiceover_option"]:checked')?.value;
    
    reviewContent.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6>Project Details</h6>
                <ul class="list-unstyled">
                    <li><strong>Name:</strong> ${name}</li>
                    <li><strong>Type:</strong> ${type ? type.charAt(0).toUpperCase() + type.slice(1) : ''}</li>
                    <li><strong>Category:</strong> ${category}</li>
                    <li><strong>Language:</strong> ${language.charAt(0).toUpperCase() + language.slice(1)}</li>
                    <li><strong>Video Format:</strong> ${videoFormats.includes('all') ? 'All Formats (16:9, 1:1, 9:16)' : videoFormats.join(', ')}</li>
                </ul>
            </div>
            <div class="col-md-6">
                <h6>Content Options</h6>
                <ul class="list-unstyled">
                    <li><strong>Script:</strong> ${scriptOption === 'generate' ? 'AI Generated' : 'Custom Script'}</li>
                    <li><strong>Voiceover:</strong> ${voiceOption === 'ai' ? 'AI Generated' : voiceOption === 'upload' ? 'Custom Upload' : 'None'}</li>
                </ul>
            </div>
        </div>
        <div class="mt-3">
            <h6>Description</h6>
            <p class="text-muted">${description}</p>
        </div>
    `;
}

// Handle script option changes
document.querySelectorAll('[name="script_option"]').forEach(radio => {
    radio.addEventListener('change', function() {
        const customScriptSection = document.getElementById('custom-script-section');
        if (this.value === 'paste') {
            customScriptSection.style.display = 'block';
        } else {
            customScriptSection.style.display = 'none';
        }
    });
});

// Handle voiceover option changes
document.querySelectorAll('[name="voiceover_option"]').forEach(radio => {
    radio.addEventListener('change', function() {
        const uploadSection = document.getElementById('voice-upload-section');
        if (this.value === 'upload') {
            uploadSection.style.display = 'block';
        } else {
            uploadSection.style.display = 'none';
        }
    });
});

// Handle video format checkbox changes
document.querySelectorAll('[name="video_format[]"]').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        const allFormatsCheckbox = document.getElementById('format-all');
        const otherCheckboxes = document.querySelectorAll('[name="video_format[]"]:not(#format-all)');

        if (this.id === 'format-all') {
            // If "All Formats" is checked, uncheck others
            if (this.checked) {
                otherCheckboxes.forEach(cb => cb.checked = false);
            }
        } else {
            // If any specific format is checked, uncheck "All Formats"
            if (this.checked) {
                allFormatsCheckbox.checked = false;
            }
        }
    });
});

// Initialize
showStep(1);

// Set initial state based on old values
@if(old('script_option') == 'paste')
    document.getElementById('custom-script-section').style.display = 'block';
@endif

@if(old('voiceover_option') == 'upload')
    document.getElementById('voice-upload-section').style.display = 'block';
@endif
</script>
@endpush
@endsection