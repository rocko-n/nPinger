$(function () {
    /**
     * @type {Object}
     */
    var config;
    /**
     * String of prev options, for mail options change check
     * @type {String}
     */
    var prevString;
    var option = $('#option');
    var tooltip = $('#tooltip');
    var idAdd = $('#add');
    var idRemove = $('#remove');
    var idRefresh = $('#refresh');
    var idMail = $('#mail');

    var val = option.val();
    /**On page reload*/
    switch (val) {
        case 'add':
            addSwitchModule();
            break;
        case 'remove':
            removeSwitchModule();
            break;
        case 'refresh':
            refreshModule();
            break;
        case 'mail':
            mailModule();
            break;
    }
    /**Listen event change on dropdown*/
    option.change(function() {
        val = option.val();
        switch (val) {
            case 'add':
                addSwitchModule();
                break;
            case 'remove':
                removeSwitchModule();
                break;
            case 'refresh':
                refreshModule();
                break;
            case 'mail':
                mailModule();
                break;
        }
    });

    $('#addbut').click(function (event) {
        var ip = $('#ip').val().trim();
        var addr = $('#addr').val().trim();

        if (ip == '' || addr == '') {

            tooltip.html('<text class="infotext">Please, write some data</text>')
                .css({
                    'top' : event.pageY + 1,
                    'left' : event.pageX + 20
                })
                .show()
                .fadeOut(2000);

        } else if (!/^\d{1,3}(.\d{1,3}){3}$/.test(ip)) {

            tooltip.html('<text class="infotext">Wrong ip</text>')
                .css({
                    'top' : event.pageY + 1,
                    'left' : event.pageX + 20
                })
                .show()
                .fadeOut(2000);

        } else {

            $.post('/set_conf', {'ip': ip, 'address': addr, 'type': 'add'}, function(res) {
                alert(res);
            });

        }
    });

    $('#rembut').click(function (event) {
        var ip = $('#remip').val().trim();

        if (ip == '') {

            tooltip.html('<text class="infotext">Please, write some data</text>')
                .css({
                    'top' : event.pageY + 1,
                    'left' : event.pageX + 20
                })
                .show()
                .fadeOut(2000);

        } else if (!/^\d{1,3}(.\d{1,3}){3}$/.test(ip)) {

            tooltip.html('<text class="infotext">Wrong ip</text>')
                .css({
                    'top' : event.pageY + 1,
                    'left' : event.pageX + 20
                })
                .show()
                .fadeOut(2000);

        } else {

            $.post('/set_conf', {'ip': ip, 'type': 'remove'}, function(res) {
                alert(res);
            });

        }
    });

    $('#refbut').click(function (event) {
        /**
         * New refresh time
         * @type {String}
         */
        var trimedVal = $('#time').val().trim();
        /**Case 1 - if nothing changed*/
        if (trimedVal == config.refreshTime) {

            tooltip.html('<text class="infotext">Noting changed</text>')
                .css({
                    'top' : event.pageY + 1,
                    'left' : event.pageX + 20
                })
                .show()
                .fadeOut(2000);
        /**Case 2 - not didgits*/
        } else if (!/^\d{1,4}$/.test(trimedVal)) {

            tooltip.html('<text class="infotext">Wrong data</text>')
                .css({
                    'top' : event.pageY + 1,
                    'left' : event.pageX + 20
                })
                .show()
                .fadeOut(2000);
        /**Case 3 - new value*/
        } else {
            /**Change refresh time in config object*/
            config.refreshTime = trimedVal;
            /**Send new config in JSON string*/
            $.post('/set_conf', {'jsonData': JSON.stringify(config), 'type': 'refreshTime'}, function(res) {
                alert(res);
            });

        }
    });

    $('#mailbut').click(function (event) {
        var newString = $('#smtp').val().trim() + $('#port').val().trim() + $('#ssl').val().trim() + $('#login').val().trim() + $('#pass').val().trim() + $('#from').val().trim() + $('#to').val().trim() + $('#cc').val().trim() + $('#subj').val().trim();

        if (prevString == newString) {

            $('#tooltip').html('<text class="infotext">Noting changed</text>')
                .css({
                    'top' : event.pageY + 1,
                    'left' : event.pageX + 20
                })
                .show()
                .fadeOut(2000);

        } else {

            config.mailOptions.host = $('#smtp').val().trim();
            config.mailOptions.port = $('#port').val().trim();

            if ($('#ssl').val().trim() === "false") {

                config.mailOptions.secure = false;

            } else if ($('#ssl').val().trim() === "true") {

                config.mailOptions.secure = true;

            } else {

                tooltip.html('<text class="infotext">Wrong field SSL</text>')
                    .css({
                        'top' : event.pageY + 1,
                        'left' : event.pageX + 20
                    })
                    .show()
                    .fadeOut(2000);
                return;

            }

            config.mailOptions.user = $('#login').val().trim();
            config.mailOptions.pass = $('#pass').val().trim();
            config.mailOptions.from = $('#from').val().trim();
            config.mailOptions.to = $('#to').val().trim();
            config.mailOptions.cc = $('#cc').val().trim();
            config.mailOptions.subject = $('#subj').val().trim();
            prevString = newString;

            $.post('/set_conf', {'jsonData': JSON.stringify(config), 'type': 'mail'}, function(res) {
                alert(res);
            });

        }

    });

    function addSwitchModule() {
        idAdd.show();
        idRemove.hide();
        idRefresh.hide();
        idMail.hide();
    }

    function removeSwitchModule() {
        idAdd.hide();
        idRemove.show();
        idRefresh.hide();
        idMail.hide();
    }

    function refreshModule() {
        idAdd.hide();
        idRemove.hide();
        idMail.hide();
        /**get config from server*/
        $.post('/get_conf', '', function (data) {
            /**parse JSON string to object*/
            config = JSON.parse(data);
            $('#time').val(config.refreshTime);
            idRefresh.show();
        });
    }

    function mailModule() {
        idAdd.hide();
        idRemove.hide();
        idRefresh.hide();
        $.post('/get_conf', '', function (data) {
            config = JSON.parse(data);
            $('#smtp').val(config.mailOptions.host);
            $('#port').val(config.mailOptions.port);
            $('#ssl').val(config.mailOptions.secure);
            $('#login').val(config.mailOptions.user);
            $('#pass').val(config.mailOptions.pass);
            $('#from').val(config.mailOptions.from);
            $('#to').val(config.mailOptions.to);
            $('#cc').val(config.mailOptions.cc);
            $('#subj').val(config.mailOptions.subject);
            idMail.show();
            prevString = config.mailOptions.host + config.mailOptions.port + config.mailOptions.secure + config.mailOptions.user + config.mailOptions.pass + config.mailOptions.from + config.mailOptions.to + config.mailOptions.cc + config.mailOptions.subject;
        });
    }
});