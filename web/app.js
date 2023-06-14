var apiUrl = 'http://localhost:3000/demo/'; // 'https://jeh7qrmbub.execute-api.ap-southeast-2.amazonaws.com/demo/';
var apiEndpoint = apiUrl + 'shotstack';
var urlEndpoint = apiUrl + 'upload/sign';
var probeEndpoint = 'https://api.shotstack.io/stage/probe/';
var s3Bucket = 'https://shotstack-demo-storage.s3-ap-southeast-2.amazonaws.com/'
var progress = 0;
var progressIncrement = 10;
var pollIntervalSeconds = 10;
var unknownError = 'An error has occurred, please try again later.';
var player;

var outputDimensions = { width: 0, height: 0 };
var defaultSdWidth = 1024;
var defaultSdHeight = 576;

/**
 * Initialise and play the video
 *
 * @param {String} src  the video URL
 */
function initialiseVideo(src) {
    player = new Plyr('#player', {
        controls: [
            'play-large',
            'play',
            'progress',
            'mute',
            'volume',
            'download',
            'fullscreen'
        ]
    });

    player.source = {
        type: 'video',
        sources: [{
            src: src,
            type: 'video/mp4',
        }]
    };

    player.download = src;

    $('#status').removeClass('d-flex').addClass('d-none');
    $('#player').show();

    player.play();
}

/**
 * Check the render status of the video
 *
 * @param {String} id  the render job UUID
 */
function pollVideoStatus(id) {
    $.get(apiEndpoint + '/' + id, function (response) {
        updateStatus(response.data.status);
        if (!(response.data.status === 'done' || response.data.status === 'failed')) {
            setTimeout(function () {
                pollVideoStatus(id);
            }, pollIntervalSeconds * 1000);
        } else if (response.data.status === 'failed') {
            updateStatus(response.data.status);
        } else {
            initialiseVideo(response.data.url);
            initialiseJson(response.data.data);
            initialiseDownload(response.data.url);
            resetForm();
        }
    });
}

/**
 * Update status message and progress bar
 *
 * @param {String} status  the status text
 */
function updateStatus(status) {
    $('#status').removeClass('d-none');
    $('#instructions').addClass('d-none');

    if (progress <= 90) {
        progress += progressIncrement;
    }

    if (status === 'submitted') {
        $('#status .fas').attr('class', 'fas fa-spinner fa-spin fa-2x');
        $('#status p').text('SUBMITTED');
    } else if (status === 'queued') {
        $('#status .fas').attr('class', 'fas fa-history fa-2x');
        $('#status p').text('QUEUED');
    } else if (status === 'fetching') {
        $('#status .fas').attr('class', 'fas fa-cloud-download-alt fa-2x');
        $('#status p').text('DOWNLOADING ASSETS');
    } else if (status === 'rendering') {
        $('#status .fas').attr('class', 'fas fa-server fa-2x');
        $('#status p').text('RENDERING VIDEO');
    } else if (status === 'saving') {
        $('#status .fas').attr('class', 'fas fa-save fa-2x');
        $('#status p').text('SAVING VIDEO');
    } else if (status === 'done') {
        $('#status .fas').attr('class', 'fas fa-check-circle fa-2x');
        $('#status p').text('READY');
        progress = 100;
    } else {
        $('#status .fas').attr('class', 'fas fa-exclamation-triangle fa-2x');
        $('#status p').text('SOMETHING WENT WRONG');
        $('#submit-video').prop('disabled', false);
        progress = 0;
    }

    $('.progress-bar').css('width', progress + '%').attr('aria-valuenow', progress);
}

/**
 * Display form field and general errors returned by API
 *
 * @param error
 */
function displayError(error) {
    if (typeof error === 'string') {
        $('#errors').text(error).removeClass('d-hide').addClass('d-block');
        return;
    }

    updateStatus(null);

    if (error.status === 400) {
        var response = error.responseJSON;
        if (typeof response.data === 'string') {
            $('#errors').text(response.data).removeClass('d-hide').addClass('d-block');
        } else {
            $('#errors').text(unknownError).removeClass('d-hide').addClass('d-block');
        }
    } else {
        $('#errors').text(unknownError).removeClass('d-hide').addClass('d-block');
    }
}

/**
 * Reset errors
 */
function resetErrors() {
    $('input, label, select').removeClass('text-danger is-invalid');
    $('.invalid-feedback').remove();
    $('#errors').text('').removeClass('d-block').addClass('d-none');
}

/**
 * Reset form
 */
function resetForm() {
    $('#submit-video').prop('disabled', false);
}

/**
 * Reset and delete video
 */
function resetVideo() {
    if (player) {
        player.destroy();
        player = undefined;
    }

    progress = 0;

    $('.json-container').html('');
    $('#json').hide();
}

/**
 * Submit the form with data to create a Shotstack edit
 */
function submitVideoEdit() {
    updateStatus('submitted');

    var formData = {
        'position': $('#position option:selected').val(),
        'scale': $('#scale option:selected').val(),
        'padding': $('#padding').val(),
        'opacity': $('#opacity option:selected').val(),
        'duration': $('#clip-length').val(),
        'video': getSelectedVideoFile(),
        'watermark': getSelectedWatermarkFile()
    };

    if (outputDimensions.width && outputDimensions.height) {
        formData.width = outputDimensions.width;
        formData.height = outputDimensions.height;
    }

    $.ajax({
        type: 'POST',
        url: apiEndpoint,
        data: JSON.stringify(formData),
        dataType: 'json',
        crossDomain: true,
        contentType: 'application/json'
    }).done(function (response) {
        if (response.status !== 'success') {
            displayError(response.message);
            $('#submit-video').prop('disabled', false);
        } else {
            pollVideoStatus(response.data.response.id);
        }
    }).fail(function (error) {
        displayError(error);
        $('#submit-video').prop('disabled', false);
    });
}

/**
 * Colour and style JSON
 *
 * @param match
 * @param pIndent
 * @param pKey
 * @param pVal
 * @param pEnd
 * @returns {*}
 */
function styleJson(match, pIndent, pKey, pVal, pEnd) {
    var key = '<span class=json-key>"';
    var val = '<span class=json-value>';
    var str = '<span class=json-string>';
    var r = pIndent || '';
    if (pKey)
        r = r + key + pKey.replace(/[": ]/g, '') + '"</span>: ';
    if (pVal)
        r = r + (pVal[0] == '"' ? str : val) + pVal + '</span>';
    return r + (pEnd || '');
}

/**
 * Pretty print JSON object on screen
 *
 * @param obj
 * @returns {string}
 */
function prettyPrintJson(obj) {
    var jsonLine = /^( *)("[\w]+": )?("[^"]*"|[\w.+-]*)?([,[{])?$/mg;
    return JSON.stringify(obj, null, 3)
        .replace(/&/g, '&amp;').replace(/\\"/g, '&quot;')
        .replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(jsonLine, styleJson);
}

/**
 * Show the JSON display button
 *
 * @param json
 */
function initialiseJson(json) {
    $('#json').show();
    $('.json-container').html(prettyPrintJson(json));
}

/**
 * Open video in new window
 *
 * @param {String} url 
 */
function initialiseDownload(url) {
    $('#download').attr("href", url);
}

/**
 * Set URL to active
 * @param {Object} $urlButton 
 */
function setUrlActive($urlButton) {
    var $parent = $urlButton.closest('.video-group');
    var $videoUrlField = $parent.children('.input-url');
    var $uploadField = $parent.children('.upload');

    $urlButton.addClass('btn-primary').removeClass('btn-secondary');
    $videoUrlField.prop('required', true);
    $uploadField.removeAttr('required');
    $videoUrlField.slideDown('fast');
}

/**
 * Set URL to inactive
 * @param {Object} $urlButton 
 */
function setUrlInactive($urlButton) {
    var $parent = $urlButton.closest('.video-group');
    var $videoUrlField = $parent.children('.input-url');

    $urlButton.removeClass('btn-primary').addClass('btn-secondary');
    $videoUrlField.removeAttr('required');
    $videoUrlField.slideUp('fast');
}

/**
 * Set upload to active
 * @param {Object} $uploadButton 
 */
function setUploadActive($uploadButton) {
    var $parent = $uploadButton.closest('.video-group');
    var $videoUrlField = $parent.children('.input-url');
    var $uploadField = $parent.find('.upload');
    var $filePlaceholder = $parent.children('.file-placeholder');

    $uploadButton.addClass('btn-primary').removeClass('btn-secondary');
    $videoUrlField.removeAttr('required');
    $uploadField.prop('required', true);
    $filePlaceholder.slideDown('fast');
}

/**
 * Set Upload to inactive
 * @param {Object} $uploadButton 
 */
function setUploadInactive($uploadButton) {
    var $parent = $uploadButton.closest('.video-group');
    var $uploadField = $parent.find('.upload');
    var $filePlaceholder = $parent.children('.file-placeholder');

    $uploadButton.removeClass('btn-primary').addClass('btn-secondary');
    $uploadField.removeAttr('required');
    $filePlaceholder.slideUp('fast');
}

/**
 * Remove a file from upload
 *
 * @param {*} $removeButton 
 */
function removeFile($removeButton) {
    var $uploadButton = $removeButton.closest('.video-group').find('.upload-button');
    var $filename = $removeButton.siblings('.name');

    setUploadInactive($uploadButton);
    $filename.empty().removeAttr('data-file');
}

/**
 * Get the URL of the selected video file
 */
function getSelectedVideoFile() {
    var $videoUrl = $('#video-url');
    var $videoFile = $('#video-upload');

    if ($videoUrl.prop('required')) {
        return $videoUrl.val();
    }

    if ($videoFile.prop('required')) {
        var $videoFileName = $('#video-file .name');
        return s3Bucket + encodeURIComponent($videoFileName.attr('data-file'));
    }
}

/**
 * Get the URL of the selected watermark file
 */
function getSelectedWatermarkFile() {
    var $watermarkUrl = $('#watermark-url');
    var $watermarkFile = $('#watermark-upload');

    if ($watermarkUrl.prop('required')) {
        return $watermarkUrl.val();
    }

    if ($watermarkFile.prop('required')) {
        var $watermarkFileName = $('#watermark-file .name');
        return s3Bucket + encodeURIComponent($watermarkFileName.attr('data-file'));
    }
}

/**
 * Return the width and height of the output video, respecting any rotation.
 * Return 0 for both width and height if we can't determine either.
 *
 * @param {any} metadata - video file metadata
 *
 * @return {object} - { width, height } of output video
 */
function determineOutputWidthHeight(metadata) {
    /**
     * Find the video stream.
     *
     * @param {any} streams - array of video file metadata streams
     *
     * @return {any} - video stream; null if none available.
     */
    function findVideoStream(streams) {
        var i;
        for (i = 0; i < streams.length; i++) {
            if (streams[i].codec_type === 'video') {
                return streams[i];
            }
        }
        return null;
    }

    /**
     * Swap width and height.
     *
     * @param {object} - { width, height }
     */
    function swapWithHeight(dims) {
        var tmp = dims.width;
        dims.width = dims.height;
        dims.height = tmp;
    }

    var dimensions = { width: 0, height: 0 };
    var sdDimensions = { width: defaultSdWidth, height: defaultSdHeight };

    var videoStream = findVideoStream(metadata.streams);
    if (videoStream) {
        if (videoStream.width) {
            dimensions.width = videoStream.width;
        }
        if (videoStream.height) {
            dimensions.height = videoStream.height;
        }

        if (dimensions.width && dimensions.height) {
            if (dimensions.height > dimensions.width) {
                swapWithHeight(sdDimensions);
            }

            // Swap width and height if this video is rotated.
            if (videoStream.tags?.rotate === '90' || videoStream.tags?.rotate === '270') {
                swapWithHeight(dimensions);
                swapWithHeight(sdDimensions);
            } else if (videoStream.side_data_list?.length &&
                    (videoStream.side_data_list[0].rotation === -90 ||
                        videoStream.side_data_list[0].rotation === -270)) {
                swapWithHeight(dimensions);
                swapWithHeight(sdDimensions);
            }

            // Keep width and height under SD size.
            if (dimensions.width > sdDimensions.width ||
                    dimensions.height > sdDimensions.height) {
                if (dimensions.width > dimensions.height) {
                    var factor = sdDimensions.width / dimensions.width;
                    dimensions.width = sdDimensions.width;
                    dimensions.height = Math.floor(factor * dimensions.height);
                } else {
                    var factor = sdDimensions.height / dimensions.height;
                    dimensions.height = sdDimensions.height;
                    dimensions.width = Math.floor(factor * dimensions.width);
                }
            }

            // Custom dimensions must be divisible by 2.
            if (dimensions.width % 2) {
                dimensions.width = dimensions.width + 1;
            }
            if (dimensions.height % 2) {
                dimensions.height = dimensions.height + 1;
            }
        }
    }

    return dimensions;
}

/**
 * Get the length of a video file and update the max duration.
 * Uses the Shotstack probe endpoint
 * 
 * @param {String} url 
 */
function setVideoDurationFromFile(url) {
    var $clipLengthField = $('#clip-length');
    $clipLengthField.prop('disabled', true);

    $.get(probeEndpoint + encodeURIComponent(url), function (data, status) {
        var duration = Math.round(data.response.metadata.format.duration * 10) / 10;
        $clipLengthField.val(duration);
        $clipLengthField.prop('max', duration);
        $clipLengthField.prop('disabled', false);

        outputDimensions = determineOutputWidthHeight(data.response.metadata);
    }).fail(function() {
        $clipLengthField.prop('max', 120);
        $clipLengthField.prop('disabled', false);
    })
}

/**
 * Upload a file to AWS S3
 * 
 * @param {String} file 
 * @param {Object} presignedPostData 
 * @param {Object} element 
 */
function uploadFileToS3(file, presignedPostData, element) {
    var $uploadField = $(element);
    var $parent = $uploadField.closest('.video-group');
    var $uploadButton = $parent.find('.upload-button');
    var $loadingSpinner = $uploadButton.find('.loading-image');
    var $uploadIcon = $uploadButton.find('.upload-icon');
    var $filePlaceholder = $parent.children('.file-placeholder');
    var $filePlaceholderName = $filePlaceholder.children('.name');

    var formData = new FormData();
    Object.keys(presignedPostData.fields).forEach(key => {
        formData.append(key, presignedPostData.fields[key]);
    });
    formData.append('file', file);

    $loadingSpinner.removeClass('d-none');
    $uploadIcon.addClass('d-none');

    $.ajax({
        url: presignedPostData.url,
        method: 'POST',
        data: formData,
        contentType: false,
        processData: false
    }).done(function (response, statusText, xhr) {
        $loadingSpinner.addClass('d-none');
        $uploadIcon.removeClass('d-none');
        if (xhr.status === 204) {
            setUploadActive($uploadButton);
            if ($uploadField.attr('id') === 'video-upload') {
                setVideoDurationFromFile(s3Bucket + presignedPostData.fields['key']);
            }
            $filePlaceholderName.text(file.name).attr('data-file', presignedPostData.fields['key']);
        } else {
            console.log(xhr.status);
        }
    }).fail(function (error) {
        console.error(error)
        displayError('Failed to upload file to S3');
    });
}

/**
 * Get an AWS signed URL for S3 uploading
 *
 * @param {*} name 
 * @param {*} type 
 * @param {*} callback 
 */
function getS3PresignedPostData(name, type, callback) {
    var formData = new FormData();
    var formData = {
        'name': name,
        'type': type
    };

    $.ajax({
        type: 'POST',
        url: urlEndpoint,
        data: JSON.stringify(formData),
        dataType: 'json',
        crossDomain: true,
        contentType: 'application/json'
    }).done(function (response) {
        if (response.status !== 'success') {
            displayError(response.message);
        } else {
            callback(response.data);
        }
    }).fail(function (error) {
        console.error(error)
        displayError('Failed to generate S3 signed URL');
    });
}

/**
 * Check video and watermark are selected
 */
function isFormValid() {
    $requiredFields = $('.video-group').find('input[required]');

    if ($requiredFields.length !== 2) {
        return false;
    }

    return true;
}

/**
 * Event Handlers
 */
$(document).ready(function () {
    /** URL button click event */
    $('.url-button').click(function () {
        var $urlButton = $(this);
        var $parent = $urlButton.closest('.video-group');
        var $videoUrlField = $parent.children('.input-url');
        var $uploadButton = $parent.find('.upload-button');

        setUploadInactive($uploadButton);

        if ($videoUrlField.is(':hidden')) {
            setUrlActive($urlButton);
        } else {
            setUrlInactive($urlButton);
        }
    })

    /** Upload button click event */
    $('.upload-button').click(function (event) {
        var $uploadButton = $(this);
        var $parent = $uploadButton.closest('.video-group');
        var $uploadField = $parent.find('.upload');
        var $urlButton = $parent.find('.url-button');

        setUrlInactive($urlButton);
        $uploadField.prop('required', true).click();

        event.preventDefault();
    });

    /** Remove file button click event */
    $('.remove-file').click(function () {
        removeFile($(this));
    });

    /** File upload change event */
    $('.upload').change(function (event) {
        var name = event.target.files[0].name;
        var type = event.target.files[0].type;

        getS3PresignedPostData(name, type, function (data) {
            uploadFileToS3(event.target.files[0], data, event.target);
        });
    });

    /** Video URL field change event */
    $('#video-url').blur(function () {
        var videoUrl = $(this).val();
        setVideoDurationFromFile(videoUrl);
    });

    /** Form submit event */
    $('form').submit(function (event) {
        if (isFormValid()) {
            resetErrors();
            resetVideo();
            submitVideoEdit();
        } else {
            displayError('Please select both a video and a watermark.')
        }

        event.preventDefault();
    });
});
