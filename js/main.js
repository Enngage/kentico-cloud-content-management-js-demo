
(function ($) {
    "use strict";

    // prepare rxjs
    var Rxjs = window['rxjs'];
    var BlobUtil = window['blobUtil'];

    /*==================================================================
    [ Validate ]*/
    var input = $('.validate-input .input100');

    $('.validate-form').on('submit', function (e) {
        e.preventDefault();
        var check = true;

        for (var i = 0; i < input.length; i++) {
            if (validate(input[i]) == false) {
                showValidate(input[i]);
                check = false;
            }
        }

        var typeCodename = 'article';
        var language = $("input[name=Language]:checked").val();
        var title = $('input[name="Title"]').val();
        var summary = $('input[name="Summary"]').val();
        var body = $('textarea[name="Body"]').val();
        var metaDescription = $('input[name="MetaDescription"]').val();
        var keywords = $('input[name="Keywords"]').val();
        var postDate = $('input[name="PostDate"]').val();

        var fileList = $('input[name="File"]').prop('files');
        var file;
        if (fileList && fileList.length === 1) {
            file = fileList[0];
        }

        if (check) {
            // data is valid
            processFile(file, (uploadedFile) => {
                let fileReference = [];

                if (uploadedFile) {
                    fileReference.push({
                        id: uploadedFile.id
                    });
                }

                createItem(
                    typeCodename,
                    language,
                    title,
                    summary,
                    '<p> ' + body + '</p>',
                    metaDescription,
                    keywords,
                    new Date(postDate),
                    fileReference
                );
            });
        }



        return check;
    });


    $('.validate-form .input100').each(function () {
        $(this).focus(function () {
            hideValidate(this);
        });
    });

    function removeExtensionFromfilename(filename) {
        return filename.replace(/\.[^/.]+$/, '');
    }

    function getAlphanumericString(val) {
        return val.replace(/[^0-9a-zA-Z]/g, '');
    }

    function getClient() {
        return new ContentManagementClient({
            projectId: '3da887f1-21a0-008c-bfc8-73ca634f2578',
            apiKey: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3NWM1OGI2ZTNhZTU0ZDNlYjAwNmE3MTg1MDQyNjNmMCIsImlhdCI6IjE1NDgwNjk0NzgiLCJleHAiOiIxNTU1ODQ1NDc4IiwicHJvamVjdF9pZCI6IjNkYTg4N2YxMjFhMDAwOGNiZmM4NzNjYTYzNGYyNTc4IiwidmVyIjoiMi4xLjAiLCJ1aWQiOiJ1c3JfMHZRWUJDcUF2cm5vNXJpZkhuaVlFRyIsImF1ZCI6Im1hbmFnZS5rZW50aWNvY2xvdWQuY29tIn0.jEBlTFcaa8r-bg9J_pc0N5T-u4_axnMHyx-29jbkyaI'
        });
    }

    function processFile(file, callback) {
        var client = getClient();
        if (!file) {
            callback(undefined);
        } else {

            var processedFilename = getAlphanumericString(removeExtensionFromfilename(file.name));

            var fileReader = new FileReader();
            fileReader.onload = function () {
                // get blob of file
                // see https://www.npmjs.com/package/blob-util
                var fileBinary = blobUtil.arrayBufferToBlob(fileReader.result)

                var subs = client.uploadBinaryFile().withData({
                    binaryData: fileBinary,
                    contentLength: file.size,
                    contentType: file.type,
                    filename: processedFilename
                })
                    .toObservable()
                    .pipe(
                        Rxjs.operators.flatMap(response => {
                            return client.addAsset()
                                .withData({
                                    descriptions: [],
                                    fileReference: {
                                        id: response.data.id,
                                        type: response.data.type
                                    }
                                })
                                .toObservable()

                        }),
                        Rxjs.operators.map(response => {
                            callback(response.data);
                        }),
                        Rxjs.operators.catchError(err => handleError(err))
                    );

                subs.subscribe();

            };
            fileReader.readAsArrayBuffer(file);
        }
    }

    function createItem(typeCodename, language, title, summary, body, metaDescription, keywords, postDate, fileReference) {
        var client = getClient();
        var obs = client.addContentItem()
            .withData(
                {
                    external_id: undefined,
                    name: title,
                    type: {
                        codename: typeCodename
                    },
                    sitemap_locations: undefined
                }
            )
            .toObservable()
            .pipe(
                Rxjs.operators.flatMap(response => {
                    // create language variant
                    return client.upsertLanguageVariant()
                        .byCodename(response.data.codename)
                        .forLanguageCodename(language)
                        .withElementCodenames([
                            {
                                codename: 'title',
                                value: title
                            },
                            {
                                codename: 'summary',
                                value: summary
                            },
                            {
                                codename: 'body_copy',
                                value: body
                            },
                            {
                                codename: 'post_date',
                                value: postDate
                            },
                            {
                                codename: 'meta_keywords',
                                value: keywords
                            },
                            {
                                codename: 'meta_description',
                                value: metaDescription
                            },
                            {
                                codename: 'teaser_image',
                                value: fileReference
                            }
                        ]).toObservable()
                }),
                Rxjs.operators.map(response => handleSuccess()),
                Rxjs.operators.catchError(err => handleError(err))
            );

        obs.subscribe();
    }

    function handleSuccess() {
        $('#SuccessMessage').show();
        $('#ArticleForm').hide();
    }

    function handleError(err) {
        $('#ErrorMessage').show();
        $('#ErrorMessage').text('There was an unexpected error: ' + err.message);
        $('#ArticleForm').hide();
    }

    function validate(input) {
        if ($(input).attr('type') == 'email' || $(input).attr('name') == 'email') {
            if ($(input).val().trim().match(/^([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{1,5}|[0-9]{1,3})(\]?)$/) == null) {
                return false;
            }
        }
        else {
            if ($(input).val().trim() == '') {
                return false;
            }
        }
    }

    function showValidate(input) {
        var thisAlert = $(input).parent();

        $(thisAlert).addClass('alert-validate');
    }

    function hideValidate(input) {
        var thisAlert = $(input).parent();

        $(thisAlert).removeClass('alert-validate');
    }


})(jQuery);