function log(message)
{
	div = document.getElementById("log");
	div.innerHTML += (message.replace(/\n/g, "<br>") + "<br>");
	div.scrollTop = div.scrollHeight;
}

function log_console(object)
{
	console.log("%o", object);
}

function getConfluenceURL(url)
{
	return Base.convertConfluenceURL(url).then(function(url)
	{
		return Promise.resolve({"url": {"confluence": url}});
	});
}

function load()
{
	getConfluenceURL(document.getElementById("url_confluence").value).then(getConfluenceContent).then(convertPage).then(function(page)
	{
		document.getElementById("input").value = page.content.storage;
		document.getElementById("output").value = page.content.converted;
		log(page.log);
	}).catch(log);
}

function submit()
{
	var input = document.getElementById("input").value;
	
	Base.convert(input).then(function(result)
	{
		document.getElementById("output").value = result.result;
		log(result.log);
	});
}