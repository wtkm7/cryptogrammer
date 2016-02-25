(function(){

// CryptoChar stores information about a single character in the cryptogram.
var CryptoChar = Backbone.Model.extend({
	defaults: {
		ciphertext: '',
		usertext: '',
		plaintext: '',
		correct: false
	}
});

// CryptoCharCollection stores a set of CryptoChar models.
var CryptoCharCollection = Backbone.Collection.extend({});

// CryptoCharView contains logic for displaying CryptoChars.
var CryptoCharView = Backbone.View.extend({
	
	initialize: function(){
		
		// Check for correctness and render the view on model change.
		this.model.on('change', function(){	
			
			// If the usertext for this character is correct, mark it as
			// correct
			if(this.model.get('usertext') === this.model.get('plaintext')){
				this.model.set('correct', true);
			}else{
				this.model.set('correct', false);
			}
			
			this.render();
			
		}, this);
	},
	
	template: _.template($('#cryptochar-template').html()),
	
	events: {
		
		// When the user updates their guess for a character, update all models
		// related to that character.
		'keyup input.cryptogram-answer' : 'updateCryptoCharModels',
	},
	
	updateCryptoCharModels: function(e){
		
		// Get the current guess for the character that was changed.
		var usertext = $(e.currentTarget).val().toUpperCase();
		
		// Update each character that shares the same ciphertext as the one
		// that was changed.
		this.cryptocharlookup[this.model.get('ciphertext')].forEach(function(e){
			e.set('usertext', usertext);
		});
	},
	
	render: function(){
		var output =  this.template({cryptochar:this.model.toJSON()});
		this.$el.html(output);
		return this;
	}
});

function buildCryptogram(){
	
	// Clear the alert section.
	$('#alerts').empty();
	
	// Read the search phrase from the textbox.
	var searchphrase = $('#searchphrase-box').val();

	$.ajax({
		url: 'cryptogram/'+searchphrase,
		success: function(data, textStatus, jqXHR){
			
			// Add header about the search phrase.
			$('#searchphrase-header').empty();
			$('#searchphrase-header').append('<h3>Cryptogram about <searchphrase>' + searchphrase + '</searchphrase></h3>')
			
			// Show the cryptogram panel
			$('#cryptogram').css('display','inline');
			
			// Clear the canvas section.
			$('#cryptogram-canvas').empty();
			
			var cryptocharlookup = {};
			
			// Generate CryptoChar models and populate cryptocharlookup.
			var cryptochars = _.zip(data['cryptogram'], data['solution']).map(function(d){
				
				var cryptochar = new CryptoChar({ciphertext: d[0], usertext: '', plaintext: d[1] })
				
				// Add this model to cryptocharlookup.
				if(!cryptocharlookup.hasOwnProperty(d[0])){
					cryptocharlookup[d[0]] = [cryptochar];
				}else{
					cryptocharlookup[d[0]].push(cryptochar);
				}
				
				return cryptochar;
			});
			
			var cryptogram = new CryptoCharCollection(cryptochars);
			
			// Create a new view for every character model in the
			// cryptogram.
			var cryptocharviews = cryptogram.map(function(cryptochar){
				var cryptocharview = new CryptoCharView({model: cryptochar});
				cryptocharview.cryptocharlookup = cryptocharlookup;
				return cryptocharview;
			});

			// For each view, add a new element to the cryptogram, attach
			// the view to that element and render each character view.
			cryptocharviews.forEach(function(cryptocharview){
				$('#cryptogram-canvas').append('<div id="'+cryptocharview.cid+'"></div>');
				cryptocharview.setElement('#'+cryptocharview.cid);
				cryptocharview.render();
			});

			// When show-plaintext-button is clicked, fill in the correct
			// plaintext for each character.
			$('#show-plaintext-button').click(function(){
				cryptogram.forEach(function(cryptochar){
						var plaintext = cryptochar.get('plaintext');
						cryptochar.set('usertext', plaintext);
				});
			});
			
			// Show the show-plaintext-button.
			$('#show-plaintext-button').css('display', 'inline');
			
			//Clear auto-complete values of text fields.
			$('.cryptogram-answer').val('');
			
		},
		error: function(jqXHR, textStatus, errorThrown){
				var responseJSON = $.parseJSON(jqXHR.responseText);
				
				// Add an alert with the error message returned by the
				// server.
				$('#alerts').append('<div class="alert alert-danger" role="alert"><strong>Error!</strong> '+responseJSON['message']+'</div>');
		}
		
	});
}

// When the build-button is clicked, request a cryptogram from the backend and
// present it to the user.
$('#build-button').click(buildCryptogram);

// Also call build-cryptogram when the user presses enter.
$('#searchphrase-box').keypress(function(e){
    if(e.which === 13){
        buildCryptogram();
    }
});

})();

