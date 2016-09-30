from bs4 import BeautifulSoup
import bs4

log_string = ""

def log(msg):
	global log_string
	log_string += msg + "\n"

def parse_li(element):
	return parse(element.contents)

def parse_br(element): #newline
	return "\n"

def parse_em(element): 
	return "//" + parse(element.contents) + "//"

def parse_h1(element):
	return "\n" + "= " + parse(element.contents) + " ="

def parse_h2(element):
	return "\n" + "== " + parse(element.contents) + " =="

def parse_h3(element):
	return "\n" + "=== " + parse(element.contents) + " ==="
	
def parse_h4(element):
	return "\n" + "==== " + parse(element.contents) + " ===="

def parse_h5(element):
	return "\n" + "===== " + parse(element.contents) + " ====="

def parse_h6(element):
	return "\n" + "====== " + parse(element.contents) + " ======"

def parse_strong(element): #bold
	return "**" + parse(element.contents) + "**"
	
def parse_div(element):
	return parse(element.contents)

def parse_p(element):
	return "\n" + parse(element.contents).strip() + "\n"
	
def parse_u(element):
	return "__" + parse(element.contents).strip() + "__"
	
def parse_span(element):
	return parse(element.contents)
	
def parse_a(element):
	if hasattr(element, "attrs"):
		if "href" in element.attrs:
			if parse(element.contents) == element.attrs["href"]:
				return "[[" + element.attrs["href"] + "]]"
			else:
				return "[[" + parse(element.contents) + ">>" + element.attrs["href"] + "]]"
		
		if "name" in element.attrs:
			log("Skipping anchor " + element.attrs["name"])
			return ""
			
		else:
			raise Exception("Missing attributes")	
	else:
		raise Exception("Missing attributes")
	
def parse_ac_emoticon(element):
	emoticons = {"smile": ":)", "wink": ";)", "yellow-star": "(*)", "tick": "(/)", "warning": "(!)", "question": "(?)"}
	
	name = element.attrs["ac:name"]
	
	if name in emoticons:
		return emoticons[name]
	else:
		log("Unkown emoticon " + name)
		return "(" + name + ")"


def parse_table(element):
	data = []
	
	table_body = element.find('tbody')
	
	text = "\n"
	
	for row in table_body.find_all('tr'):		
		for col in row.contents:
			if col.name == "th" or col.name == "td":
				span = 1 if "colspan" not in col.attrs else int(col.attrs["colspan"])
				seperator = "|= " if col.name == "th" else "| "
				
				for i in range (0, span):
					if i == 0:
						text += seperator + parse(col.contents).strip().replace("\n\n", "\n")
					else:
						text += seperator
			
		text += "\n"
		
	return(text)

def create_list(element, syntax):
	text = ""	
	rows = element.find_all("li")
	
	for row in rows:
		text += "\n" + syntax + " " + parse(row).strip()
		
	return text
	
def parse_dl(element):
	return "\n"
	
def parse_ol(element): #numbered list
	return create_list(element, "1.")
	
def parse_ul(element): #bulletpoints
	return create_list(element, "* ")
	
def parse_code(element):
	return "##" + parse(element.contents) + "##"
	
def parse_pre(element):
	return parse_code(element)
	
def create_link(label, destination):
	if label == destination:
		return "[[" + destination + "]]"
	else:
		return "[[" + label + ">>" + destination + "]]"

def parse_ac_link(element): #link
	label = destination = ""

	for link in element.contents:
		if link.name == "ri:page":
			label = destination = link.attrs["ri:content-title"]
		elif link.name == "ri:space":
			label = destination = link.attrs["ri:space-key"]
		
		elif link.name == "ac:plain-text-link-body":
			label = link.text
		
		elif type(link) == bs4.element.NavigableString and str(link) == "\n":
			continue
		elif link.name == "contentbylabel":
			continue
		
		else:
			log("Ignoring link of type " + link.name)
			return ""
	
	return create_link(label, destination)

def parse_ac_image(element):
	return "[[image:" + element.find("ri:attachment").attrs["ri:filename"] + "]]"

def parse_ac_structured_macro(element):
	if element.attrs["ac:name"] == "include":
		return create_link("include", element.find("ri:page").attrs["ri:content-title"])
	
	elif element.attrs["ac:name"] == "excerpt-include":
		return create_link("include", element.find("ri:page").attrs["ri:content-title"])
	
	elif element.attrs["ac:name"] == "code":
		language = element.find("ac:parameter")
		body = element.find("ac:plain-text-body").text
		if language == None:
			return "\n\n{{code}}\n" + body + "\n{{/code}}\n"
		else:
			return "\n\n{{code language=\"" + language.text + "\"}}\n" + body + "\n{{/code}}\n"
	
	elif element.attrs["ac:name"] == "excerpt":
		log("Removing excerpt")
		return parse(element.find("ac:rich-text-body").contents)
	
	elif element.attrs["ac:name"] == "toc":
		return("{{toc/}}")
	
	elif element.attrs["ac:name"] == "panel":
		return parse(element.find("ac:rich-text-body").contents)
	
	elif element.attrs["ac:name"] == "details":
		return parse(element.find("ac:rich-text-body").contents)
	
	elif element.attrs["ac:name"] == "warning":
		return "{{error}}" + parse(element.find("ac:rich-text-body").contents).strip() + "{{/error}}\n\n"
	elif element.attrs["ac:name"] == "note":
		return "{{warning}}" + parse(element.find("ac:rich-text-body").contents).strip() + "{{/warning}}\n\n"
	elif element.attrs["ac:name"] == "info":
		return "{{info}}" + parse(element.find("ac:rich-text-body").contents).strip() + "{{/info}}\n\n"
	elif element.attrs["ac:name"] == "tip":
		return "{{success}}" + parse(element.find("ac:rich-text-body").contents).strip() + "{{/success}}\n\n"
	
	
	else:
		log("Ignoring structured macro of type " + element.attrs["ac:name"])
		return ""
	
def parse_ac_macro(element):
	return parse_ac_structured_macro(element)

def parse_ac_layout(element): #column layout
	text = ""
	
	sections = element.findAll("ac:layout-section")	
	for section in sections:
		if(section.attrs["ac:type"] == "single"):
			text += parse(section.find("ac:layout-cell").contents).strip() + "\n"
		else:		
			text += "{{container layoutStyle=\"columns\"}}\n"			
			cells = section.findAll("ac:layout-cell")
			for cell in cells:
				text += "(((" + parse(cell.contents).strip() + ")))\n"
			
			text += "{{/container}}\n"
			
	return text

def parse_ac_task_list(element):
	text = "\n"
	
	for entry in element.findAll("ac:task", recursive = False):
		text +=  "* " + parse(entry.find("ac:task-body").contents).strip() + "\n"
	
	return text
	
	
def parse(element):
	if isinstance(element, list):
		buffer = ""
		for child in element:
			buffer = buffer + parse(child)
		return buffer
	
	if type(element) == bs4.element.NavigableString:
		if str(element) == "\n":
			return ""
		else:
			return str(element).replace("--", "~-~-")
	
	ignored = ["ac_placeholder"]
	name = str(element.name).replace("-", "_").replace(":", "_")
	
	if name in ignored:
		return ""
		
	# search for matching parse function and call it
	elif "parse_" + name in globals():
		return globals()["parse_" + name](element)
	
	else:
		log("unknown: " + name)
		return ""

def convert(text):
	global log_string
	soup = BeautifulSoup(text, "html.parser")
	contents = soup.contents
	while "\n" in contents: contents.remove("\n")
	return (parse(contents).strip(), log_string.strip())