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
            
            var shouldRemove = false;    
            if(rx.test(article.URL)) {
                shouldRemove = true;
                console.log("Full Slate article detected: " + article.URL);
            }
            
            if(shouldRemove) {
                articles.remove({_id: article._id}, function(err){
                    if(err){
                        console.log("Couldn't remove.");
                        console.dir(err);
                        process.kill();
                    }
                });
            }
            
            // Replace bloated strings with trimmed versions of themselves
            
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
            var newLinks = [];
            article.totalLinkWords = 0;
            article.totalLinkCharacters = 0;
            article.totalLinksToSlate = 0;
            for(i = 0; i < article.links.length; i++) {
                var link = article.links[i];
                var trimmedLink = link.text.trim();
                if (trimmedLink != link.text) {
                    console.log("Trimming link from '" + link.text + "' to '" + trimmedLink + "'"); 
                    link.text = trimmedLink;
                }
                link.length = link.text.length;
                link.wordCount = link.text.split(" ").length;
                
                // Check if the link contains Slate, SlateGroup, Graham Holdings
                if (link.href.indexOf("slate.com") !== -1) {
                    if(!link.linksToSlate){
                        console.log("Found a link to another Slate article: " + article.URL + " > " + link.href);
                    }
                    link.linksToSlate = 1;
                } else {
                    link.linksToSlate = 0;
                }
                
                
                // Remove all links where the text is empty (to deal with images)
                if (link.length == 0) {
                    console.log("Empty link DETECTED! " + article.URL);
                } else if (link.href.indexOf(article.URL) == 0) {
                    // Remove all links that are to the same page (diff sections) - with regex
                    console.log("Internal link DETECTED! " + link.href);
                } else {    
                    newLinks[newLinks.length] = link;
                    article.totalLinkWords += link.wordCount;
                    article.totalLinkCharacters += link.length;
                    article.totalLinksToSlate += link.linksToSlate;
                }
            }
            if(article.links.length != newLinks.length){
                console.log("Removed " + (article.links.length - newLinks.length) + " links.");
            }
            article.links = newLinks;
            
            // Trim paragraphs
            var newParagraphs = [];
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
            
            article.averageAnchorTextWordCount = article.totalLinkWords / article.links.length;
            
            article.averageAnchorTextCharacterCount = article.totalLinkCharacters / article.links.length;
            
            article.linksPerWord = article.totalLinkWords / article.wordCount;
                
            articles.update({_id: article._id}, article, {w: 1}, function(err, article) {
                if(err){
                    console.log("Couldn't trim: ", article.URL);
                    console.dir(err);
                    process.kill();
                }
                articles.remove({URL: article.URL, _id: {$ne: article._id}}, function(err, articlesDeleted){
                    if(articlesDeleted){
                        console.log("Removing duplicate article: " + article.URL);
                    }
                    if(err){
                        console.log("Couldn't remove duplicate article: " + article.URL);
                        console.dir(err);
                        process.kill();
                    }
                    fixArticle(articles);
                });
            });  
        });
    };    
    
            
            //author stuff:
                //parse list when multiple authors

            
            //for each link: does it point back to... test each of the sites (regex)
                //links to: Slate (true/false), Slate Group (t/f), Graham Holdings(t/f)
                            
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

