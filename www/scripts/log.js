$(function () {

    $.post('/log', 'give_me_logfile', function (data) {
        $('#log').html(data);
    });

});