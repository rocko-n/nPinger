// Update info about fallen switces
///////////////////////////////////////////////////////////////////////////////////////
/*function heartBeat() {
    $.post('/update', 'update', function (result) {
         if (result == $('#chat').html()) {  
             console.log(true);           
             return;
         }
         else {   
             console.log(false);          
             $('#chat').html(result); 
         }; 
    });
}; 

setInterval(heartBeat, 60000); */
/////////////////////////////////////////////////////////////////////////////////////////

$(function() { 
               $.post('/log', 'give_me_logfile', function (data) {
                       $('#log').html(data);           
               });;                             
});

