$(function () {
    /**
     * Current server time (needed for duration, recieved from server)
     * @type {Date}
     */
    var serverTime;
    /**
     * Last Event time, for cheking if something new has happend
     * @type {Date}
     */
    var lastEvent;
    /**
     * Counter for clicks of buttons (not button edit, send, req-res one per click)
     * @type {number}
     */
    var counter = 0;
    /**
     * Counter for clicks of buttons edit/send
     * @type {number}
     */
    var counterEdit = 0;
    /**
     * Sort method
     * @type {{id: string}}
     */
    var sortBy = {
        id: 'addrup'
    };
    /**
     * Info message
     * @type {String}
     */
    var infoText;

    /**Function calls*/
    ifSomethingHappend();

    /**Get config*/
    $.post('/get_conf', '', function (data) {
        /**parse JSON string to object*/
        config = JSON.parse(data);
        setInterval(ifSomethingHappend, config.refreshTime*1000);
    });

    /**Change info message*/
    $('tbody#currentstats').on("click", ".edit", function () {
        counterEdit++;
        var _this = $(this);

        if (counterEdit == 1) {
            infoText = _this.siblings('text').html();
            _this.siblings('text').remove();
            _this.closest('td').prepend( '<input type="text" size="20" maxlength="40">' );
            _this.siblings('input').val(infoText).focus();
            _this.html('send');
        }
        if (counterEdit > 1 && _this.html() == 'send' && infoText != _this.siblings('input').val().trim()) {
            infoText = _this.siblings('input').val().trim();
            var unit = _this.attr("data-unit");
            var sendData = {
                info: infoText,
                unit: unit
            };

            $.post('/add_info', sendData, function (data) {
                _this.siblings('input').remove();
                _this.closest('td').prepend('<text>' + infoText + '</text>');
                _this.html('edit');
                lastEvent = data;
                counterEdit = 0;
            });

        } else if (counterEdit > 1 && _this.html() == 'send' && infoText == _this.siblings('input').val().trim()) {
            _this.siblings('input').remove();
            _this.closest('td').prepend('<text>' + infoText + '</text>');
            _this.html('edit');
            counterEdit = 0;
        } else if (counterEdit > 1 && _this.html() != 'send') {
            alert('Wrong field');
        }
    });
    /**Sorting data*/
    $('#adsort').on("click", function () {
        counter++;

        if (counter === 1) {
            if (sortBy.id === 'addrup') {
                sortBy.id = 'addrdown';
            } else {
                sortBy.id = 'addrup';
            }

            recieveStatus().then(function () {

                $("td.duration").each(function () {
                    var time = serverTime - new Date($(this).attr("data-start"));
                    $(this).text(timer(time));
                });

                counter = 0;
            });
        }

    });
    $('#evsort').on("click", function () {
        counter++;

        if (counter === 1) {
            if (sortBy.id === 'evup') {
                sortBy.id = 'evdown';
            } else {
                sortBy.id = 'evup';
            }

            recieveStatus().then(function () {
                $("td.duration").each(function () {
                    var time = serverTime - new Date($(this).attr("data-start"));
                    $(this).text(timer(time));
                });

                counter = 0;
            });
        }

    });
    /**Listen force update event -> recieve fresh news about status*/
    $('#force').on('click', function () {
        counter++;

        if (counter !== 1) {
            return;
        }

        $('#force').html('UPDATING');

        $.post('/force_update', sortBy, function (data) {
            counterEdit = 0;
            serverTime = new Date(data.now);
            $('#totalsOk').html(data.ok);
            $('#totalsDown').html(data.down);
            $('#currentstats').html(data.html);
            $('#force').html('FORCE_UPDATE');
            counter = 0;
        }).then(function () {
            $("td.duration").each(function () {
                var time = serverTime - new Date($(this).attr("data-start"));
                $(this).text(timer(time));
            });
        });

    });
    /**
     * Convert time from Date to xxdxxhxxmxxs
     * @param {Number} time
     * @returns {String}
     */
    function timer(time) {
        time = (time/1000).toFixed();
        var resTime;
        if (time < 60) {
            resTime = time + 's';
        } else if (time >= 60 && time < 3600) {
            resTime = (time/60).toFixed() + 'm' + time % 60 + 's';
        } else if (time >= 3600 && time < 86400) {
            resTime = (time/3600).toFixed() + 'h' + ((time % 3600)/60).toFixed() + 'm' + (time % 3600) % 60 + 's';
        } else {
            resTime = (time/86400).toFixed() + 'd' + ((time % 86400)/3600).toFixed() + 'h' + (((time % 86400)%3600)/60).toFixed() + 'm' + ((time % 86400) % 3600) % 60 + 's';
        }

        return resTime;
    }
    /**
     * Recieve status-data from server
     * @returns {Promise}
     */
    function recieveStatus() {

        return $.post('/status', sortBy, function (data) {
            counterEdit = 0;
            serverTime = new Date(data.now);
            $('#totalsOk').html(data.ok);
            $('#totalsDown').html(data.down);
            $('#currentstats').html(data.html);
            console.log('updated');
        });

    }
    /**
     * Recieve lastEvent time from server and if something new has happend - recieve new status-data
     * @returns {Promise}
     */
    function ifSomethingHappend() {

        return $.post('/chek', 'give_me_lastEvent', function (data) {
            serverTime = new Date(data.now);

            if (data.lastEv != lastEvent) {
                lastEvent = data.lastEv;

                recieveStatus().then(function () {
                    $("td.duration").each(function () {
                        var time = serverTime - new Date($(this).attr("data-start"));
                        $(this).text(timer(time));
                    });
                });

            } else {

                $("td.duration").each(function () {
                    var time = serverTime - new Date($(this).attr("data-start"));
                    $(this).text(timer(time));
                });

                console.log('nothing new has happend');
            }
        });

    }
});
/**
 * FontSize resizer
 */
function fontSize() {
  var width = 1200; 
  var fontSize = 62.5; 
  var bodyWidth = document.documentElement.clientWidth;
  var multiplier = bodyWidth / width; 
  fontSize = Math.floor(fontSize * multiplier);
  document.body.style.fontSize = fontSize+'%';
}
window.onload = fontSize; 
window.onresize = fontSize;