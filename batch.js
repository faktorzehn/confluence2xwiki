function log(message)
{
	div = document.getElementById("log");
	div.innerHTML += (message + "<br>");
	div.scrollTop = div.scrollHeight;
	
	return Promise.resolve();
}

function log_console(object)
{
	console.log("%o", object);
}

function logPage(page)
{
	log('<a href="' + page.url.xwiki.location + '" target="_blank">' + page.url.xwiki.location + "</a><br>" + page.log.replace(/\n/g, "<br>"));
	return Promise.resolve(page);
}

function logPages(pages)
{
	for(let page of pages)
		logPage(page);
}


function getURLs(confluence, xwiki)
{
	return Promise.all([Base.convertConfluenceURL(confluence), Base.convertXWikiURL(xwiki)]).then(function(urls)
	{
		return Promise.resolve({"confluence": urls[0], "xwiki": urls[1]});
	});
}

function submit()
{
	convert(document.getElementById("url_confluence").value, document.getElementById("url_xwiki").value, document.getElementById("attachments").checked, document.getElementById("recursive").checked).then(function()
	{
		log("== DONE ==");
	});
}

function convert(urlConfluence, urlXWiki, attachments, recursive)
{
	return getURLs(urlConfluence, urlXWiki).then(function(urls)
	{
		if(recursive)
			return transferPage(urls, attachments).then(logPage, log).then(function() {return transferSubspace(urls, attachments)});
		else
			return transferPage(urls, attachments).then(logPage, log);
	});
}

function transferSubspace(urls, attachments)
{
	return getConfluenceSubspace(urls.confluence.page).then(function(subspace)
	{
		var promises = [];
		
		for(let page of subspace)
		{
			var url = urls.xwiki.page;
			
			for(let space of page.location)
				url += "/spaces/" + space;
				
			promises.push(transferPage({"confluence": {"base": urls.confluence.base, "page": page.url}, "xwiki": {"base": urls.xwiki.base, "page": url}}, attachments).then(logPage, log));
		}
		
		return Promise.all(promises);
	});
}

function transferPage(urls, attachments = false)
{
	var page = {"url": urls};
	
	if(attachments)
		return transferPage(urls).then(getConfluenceAttachments).then(transferConfluenceAttachments);
	else
		return getConfluenceContent(page).then(convertPage).then(createXWikiPage);
}