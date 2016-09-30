function getConfluenceContent(page)
{
	return Base.getConfluenceContent(page.url.confluence.page).then(function(result)
	{
		page.title = result.title;
		page.content = {"storage": result.storage, "editor": result.editor};		
		return Promise.resolve(page);
	});
}

function convertPage(page)
{
	return Base.convert(page.content.storage).then(function(response)
	{
		page.content.converted = response.result;
		page.log = response.log;
		return Promise.resolve(page);
	}, function()
	{
		return Promise.reject("Failed to convert " + page.url.confluence.page);
	});
}

function createXWikiPage(page)
{
	return Base.createXWikiPage(page.url.xwiki.page + "/pages/WebHome", page.content.converted).then(function(url)
	{
		page.url.xwiki.location = url;
		return Promise.resolve(page);
	});
}

function getConfluenceAttachments(page)
{
	return Base.getConfluenceMultiPage(page.url.confluence.page + "/child/attachment", function(attachment, response) {return {"title": attachment["title"], "url": response["_links"]["base"] + attachment["_links"]["download"]};}).then(function(attachments)
	{
		page.attachments = attachments;
		return Promise.resolve(page);
	});
}

function transferConfluenceAttachments(page)
{
	var promises = [];
	
	for(let attachment of page.attachments)
	{
		promises.push(Base.transferBlob(attachment.url, page.url.xwiki.page + "/pages/WebHome/attachments/" +  attachment.title));
	}
	
	return Promise.all(promises).then(function()
	{
		return Promise.resolve(page);
	});	
}

function getConfluenceChildren(url)
{
	return Base.getConfluenceMultiPage(url + "/child/page", function(page, response) {return {"title": page["title"], "url": page["_links"]["self"]};});
}

function getConfluenceSubspace(url, location = [], space = [])
{
	return getConfluenceChildren(url).then(function(pages)
	{
		var promises = [];
		
		for(let page of pages)
		{
			space.push({"location": location.concat(page.title), "url": page.url});
			promises.push(getConfluenceSubspace(page.url, location.concat(page.title), space));
		}
		
		return Promise.all(promises);
	}).then(function()
	{
		return Promise.resolve(space);
	});
}