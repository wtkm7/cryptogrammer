
/*
 * Draws the cryptogram on the page.
 */
function drawcryptogram(cryptogram){
	$('#cryptogram').empty();
	$.map(cryptogram.split(''), function(char){
		
		if(char != ' '){
			var inner = '<input type="text" maxlength=1 size=1 class="cryptogram-answer cryptogram-answer-'+char+'" char="'+char+'"/>';
		}else{
			var inner = '';
		}
		
		var chartext = '<div class="col-xs-1 cryptogram-char">'
					  +'	<div class="row">'
					  +'		<div class="col-xs-1">'+inner+'</div>'
					  +'	</div>'
					  +'	<div class="row">'
					  +'		<div class="col-xs-1">'+char+'</div>'					  
					  +'	</div>'
					  +'</div>';
		
		$('#cryptogram').append(chartext);
	});
}



/*
 * Adds the solution section to the page.
 */
function addsolution(solution){
	
	$('#solution-text-panel').css('display','none');
	
	$('#show-solution-button').css('display','block');
	$('#solution-text-panel').empty().append(solution);

	/*
	 * When the show-solution button is clicked, display the
	 * solution to the cryptogram.
	 */
	$('#show-solution-button').click(function(){
		$('#solution-text-panel').css('display','block');
	});
}

/*
 * When the build-button is clicked, request a cryptogram from the backend and
 * present it to the user.
 */
$('#build-button').click(function(){
	
	// clear the alert section
	$('#alerts').empty();
	
	// Read the search phrase from the textbox.
	var searchphrase = $('#searchphrase-box').val();
	
	$.ajax({
		url: 'cryptogram/'+searchphrase,
		success: function(data, textStatus, jqXHR){

			console.log(data);
			
			// Add header about the search phrase.
			$('#searchphrase-header').empty();
			$('#searchphrase-header').append('<h3>Cryptogram about <searchphrase>'+searchphrase+'</searchphrase></h3>')
			
			drawcryptogram(data['cryptogram']);
			
			//Clear auto-complete values of text fields.
			$('.cryptogram-answer').val('');
			
			/*
			 * When a blank is filled, update other corresponding blanks.
			 */
			$('.cryptogram-answer').keyup(function() {
				var current_crypto = $(this).attr('char');
				var current_answer = $(this).val().toUpperCase();
				$('.cryptogram-answer-'+current_crypto).val( current_answer );
			});
			
			addsolution(data['solution']);
			
		},
		error: function(jqXHR, textStatus, errorThrown){
				var responseJSON = $.parseJSON(jqXHR.responseText);
				
				$('#alerts').append('<div class="alert alert-danger" role="alert">'+responseJSON['message']+'</div>');
				
				console.log(responseJSON['message']);
		}
		});

});
