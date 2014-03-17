var MongoClient = require('mongodb').MongoClient;


// Load database
var fixData = function(articles) {
    
    // Query the database and get the article data in a variable
    
    
    var fixArticle = function(articles) {
        // Find all articles that haven't been marked as trimmed
        articles.findOne({trimmed:{$exists: false}}, function(err, article) {
            var rx = /^http:\/\/www.slate.com\/full_slate/;
            
            if(article === null){
                console.log("All done!");
                return;
            }
            
            article.trimmed = true;
                
            if(rx.test(article.URL)) {
                console.log(article.URL);
                articles.remove({_id: article._id}, function(err){
                    if(err){
                        console.log("Couldn't remove.");
                        console.dir(err);
                        process.kill();
                    }
                });
            }
            
            // Trim title
            var trimmedTitle = article.title.trim();
            if (trimmedTitle != article.title) {
                console.log("Trimming title from '" + article.title + "' to '" + trimmedTitle + "'"); 
                article.title = trimmedTitle;
            }
            
            // Trim author field
            var trimmedAuthor = article.author.trim();
            if (trimmedAuthor != article.author) {
                console.log("Trimming author from '" + article.author + "' to '" + trimmedAuthor + "'"); 
                article.author = trimmedAuthor;
            }
            
            // Trim section field
            var trimmedSection = article.section.trim();
            if (trimmedSection != article.section) {
                console.log("Trimming section from '" + article.section + "' to '" + trimmedSection + "'"); 
                article.section = trimmedSection;
            }
            
            // Trim full text
            var trimmedFullText = article.fullText.trim();
            if (trimmedFullText != article.fullText.trim()) {
                console.log("Trimming article: " + article.URL);
                article.fullText = trimmedFullText;
            }

            
            // Trim links
            var i;
            for(i = 0; i < article.links.length; i++) {
                var link = article.links[i];
                var trimmedLink = link.text.trim();
                if (trimmedLink != link.text) {
                    console.log("Trimming link from '" + link.text + "' to '" + trimmedLink + "'"); 
                    link.text = trimmedLink;
                }
                link.length = link.text.length;
                link.wordCount = link.text.split(" ").length;
                article.links[i] = link;
            }
            
            // Trim paragraphs
            for(i = 0; i < article.paragraphs.length; i++) {
                var paragraph = article.paragraphs[i];
                var trimmedParagraph = paragraph.trim();
                if (trimmedParagraph != paragraph) {
                    console.log("Trimming paragraph " + i);
                    paragraph = trimmedParagraph;
                }
                article.paragraphs[i] = paragraph;     
            }
            
            
            article.linksPerParargraph = article.links.length / article.paragraphs.length;
            
            article.wordCount = article.fullText.split(" ").length;
                
            articles.update({_id: article._id}, article, function(err, article) {
                if(err){
                    console.log("Couldn't trim: ", article.URL);
                    console.dir(err);
                    process.kill();
                }
            });  
            fixArticle(articles);
        });
    };    
    // Read the data string by string
    
    // Replace bloated strings with trimmed versions of themselves
        // Run .trim on all strings that I want to trim    
    
    // Remove all links that are to the same page (diff sections) - with regex
        // Figure out if it starts with URL of same article, has # and other stuff
    
    // Remove all links where the text is empty (to deal with images)
    
    // After we do all this, will want to recalculate all the link lengths
    
    // Start recording: 
            //words per link
            //links per paragraph
            //avg anchor text str length
            //word count on link text
            //avg words/chars per link
            
            //author stuff:
                //parse list when multiple authors

            
            //for each link: does it point back to... test each of the sites (regex)
                //links to: Slate (true/false), Slate Group (t/f), Graham Holdings(t/f)
            //self-citation: how often do authors link old articles of their own?
    
    articles.update({trimmed: true}, {$unset: {trimmed:''}}, {multi: true}, function(err) {
        if(err){
            console.log("Couldn't untrim.");
            console.dir(err);
            process.kill();   
        }
        fixArticle(articles); 
    });
};


MongoClient.connect("mongodb://localhost:27017/slate", function(err, db) {
    if(err) {
        console.log("Couldn't connect.");
        console.dir(err);
        process.kill();
    }
    db.createCollection('articlesCopy1', function(err, articles) {
        if(err) {
            console.log("Couldn't create articles collection.");
            console.dir(err);
            process.kill();
        }
        fixData(articles);
           
    });
});

