var apiUrl = 'http://localhost:3000/demo/'; // 'https://jeh7qrmbub.execute-api.ap-southeast-2.amazonaws.com/demo/';
var apiEndpoint = apiUrl + 'shotstack';
var urlEndpoint = apiUrl + 'upload/sign';
var s3Bucket = 'https://shotstack-demo-storage.s3-ap-southeast-2.amazonaws.com/'
var progress = 0;
var progressIncrement = 10;
var pollIntervalSeconds = 10;
var unknownError = 'An unknown error has occurred. Dispatching minions...';
var player;

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
    updateStatus(null);

    if (error.status === 400) {
        var response = error.responseJSON;

        if (response.data.isJoi) {
            $.each(response.data.details, function (index, error) {
                if (error.context.key === 'search') {
                    $('#search-group label, #search').addClass('text-danger is-invalid');
                    $('#search-group').append('<div class="d-block invalid-feedback">Enter a subject keyword to create a video</div>').show();
                }

                if (error.context.key === 'title') {
                    $('#title-group label, #title').addClass('text-danger is-invalid');
                    $('#title-group').append('<div class="d-block invalid-feedback">Enter a title for your video</div>').show();
                }

                if (error.context.key === 'soundtrack') {
                    $('#soundtrack-group label, #soundtrack').addClass('text-danger is-invalid');
                    $('#soundtrack-group').append('<div class="d-block invalid-feedback">Please choose a soundtrack from the list</div>').show();
                }
            });
        } else if (typeof response.data === 'string') {
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
    $('form').trigger("reset");
    $('#submit-video').prop('disabled', false);
    removeFile($('.remove-file'));
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

    var val = validateToggleButtons();

    var formData = {
        'position': $('#position option:selected').val(),
        'advanced': $('#advanced-checkbox').is(':checked'),
        'scale': $('#watermark-scale option:selected').val(),
        'offsetX': $('#watermark-x-offset').val(),
        'offsetY': $('#watermark-y-offset').val(),
        'opacity': $('#watermark-opacity option:selected').val(),
        'duration': $('#clip-length').val()
    };

    if (val.video == 'url') {
        formData['video'] = $('#video-url').val();
    } else {
        formData['video'] = s3Bucket + $('#video-file .name').attr("data-file");
    }

    if (val.watermark == 'url') {
        formData['watermark'] = $('#watermark-url').val();
    } else {
        formData['watermark'] = s3Bucket + $('#watermark-file .name').attr("data-file");
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
        displayError({ status: 400, });
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

function initialiseDownload(url) {
    $('#download').attr("href", url);
}

$(document).on('click', '#advanced-checkbox', function (e) {

    if ($('#advanced-checkbox').is(':checked')) {
        $('#advanced').slideDown('fast');
        $('#advanced-checkbox-group .fas').attr('class', 'fas fa-caret-up float-right');
        $(('input.advanced') && ('select.advanced')).prop('required', true);
    } else {
        $('#advanced').slideUp('fast');
        $('#advanced-checkbox-group .fas').attr('class', 'fas fa-caret-down float-right');
        $(('input.advanced') && ('select.advanced')).removeAttr('required');
    }

});

$(document).on('click', '.url-button', function (e) {

    var videoUrl = $(this).closest('.toggle').siblings('.input-url');
    var button = $(this);
    var downloadButton = $(this).closest('.toggle').find('.upload-button');

    videoUrl.slideToggle('fast', function () {
        if (videoUrl.is(':hidden')) {
            button.removeClass('btn-primary').addClass('btn-secondary');
            videoUrl.removeAttr('required');
            videoUrl.siblings('.upload').prop('required', true);
            downloadButton.prop('disabled', false);
        } else {
            button.addClass('btn-primary').removeClass('btn-secondary');
            videoUrl.prop('required', true);
            videoUrl.siblings('.upload').removeAttr('required');
            downloadButton.prop('disabled', true);
        }
    });


})

$(document).on('click', '.upload-button', function (e) {
    e.preventDefault();
    $(this).closest('.toggle').siblings('.upload').prop('required', true);
    $(this).closest('.toggle').siblings('.upload').click();
});

$(document).on('click', '.remove-file', function (e) {
    removeFile($(this));
});

function removeFile(thisObj) {
    thisObj.closest('div').siblings('.name').empty();
    thisObj.closest('div').siblings('.name').removeAttr('data-file');
    thisObj.closest('.file-placeholder').addClass('d-none');
    thisObj.closest('.file-placeholder').siblings('.toggle').find('.upload-button').removeClass('btn-primary').addClass('btn-secondary');
    thisObj.closest('.file-placeholder').siblings('.toggle').find('.url-button').prop('disabled', false);
}

$(document).on('change', '.upload', function (e) {

    var name = e.target.files[0].name;
    var type = e.target.files[0].type;

    getPresignedPostData(name, type, function (data) {
        uploadFile(e.target.files[0], data, e.target);
    });

});

function uploadFile(file, presignedPostData, thisObj) {

    var formData = new FormData();

    Object.keys(presignedPostData.fields).forEach(key => {
        formData.append(key, presignedPostData.fields[key]);
    });

    formData.append('file', file);

    $(thisObj).siblings('.toggle').find('.loading-image').removeClass('d-none');
    $(thisObj).siblings('.toggle').find('.upload-icon').addClass('d-none');

    $.ajax({
        url: presignedPostData.url,
        method: 'POST',
        data: formData,
        contentType: false,
        processData: false
    }).done(function (response, statusText, xhr) {
        $(thisObj).siblings('.toggle').find('.loading-image').addClass('d-none');
        $(thisObj).siblings('.toggle').find('.upload-icon').removeClass('d-none');
        if (xhr.status == 204) {
            $(thisObj).siblings('.file-placeholder').removeClass('d-none');
            $(thisObj).siblings('.file-placeholder').children('.name').text(file.name);
            $(thisObj).siblings('.file-placeholder').children('.name').attr('data-file', presignedPostData.fields['key']);
            $(thisObj).siblings('.toggle').find('.upload-button').addClass('btn-primary').removeClass('btn-secondary');
            $(thisObj).siblings('.toggle').find('.url-button').prop('disabled', true);
        } else {
            console.log(xhr.status);
        }
    }).fail(function (error) {
        console.log(error);
    });

}

function getPresignedPostData(name, type, callback) {

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
        displayError({ status: 400, });
    });

}

function validateToggleButtons() {
    var buttonActivation = { number: 0, video: null, watermark: null };
    $('.toggle-button').each(function (index) {
        var sub = $(this)[0].parentElement.id.split('-')[0];
        var type = $(this)[0].parentElement.id.split('-')[2];
        $.map($(this)[0].classList, function (value, index) {
            if (value == 'btn-primary' && sub == 'video') {
                buttonActivation.number++;
                buttonActivation.video = type;
            } else if (value == 'btn-primary' && sub == 'watermark') {
                buttonActivation.number++;
                buttonActivation.watermark = type;
            }
        })
    });
    return buttonActivation;
}

$('[data-toggle="tooltip"]').tooltip({ trigger: 'click' });

$(document).ready(function () {
    $('form').submit(function (event) {
        if (validateToggleButtons().number == 2) {
            resetErrors();
            resetVideo();
            submitVideoEdit();
        } else {
            $('#errors').removeClass('d-none').text('Please select both a video and a watermark.')
        }

        event.preventDefault();
    });
});